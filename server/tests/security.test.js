// Phase 5 security checks that cut across features: headers, malformed
// requests, sessions, CSRF, privacy between users and mass assignment.
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/app.js';
import { Category } from '../src/models/Category.js';
import { Transaction } from '../src/models/Transaction.js';
import { User } from '../src/models/User.js';
import { addTransaction, findCategoryId, PASSWORD, signUp } from './helpers.js';

const sessionCookie = (token) => `ft_session=${token}`;

describe('responses', () => {
  it('are never cached and carry security headers', async () => {
    const { agent } = await signUp();
    const res = await agent.get('/api/auth/me').expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('turn broken JSON and oversized bodies into clear errors', async () => {
    const broken = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ')
      .expect(400);
    expect(broken.body.error.message).toBe('Request body is not valid JSON.');

    const huge = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'x'.repeat(1_100_000) })
      .expect(413);
    expect(huge.body.error.message).toBe('Request body is too large.');
  });

  describe('when something unexpected fails', () => {
    beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
    afterEach(() => vi.restoreAllMocks());

    it('send a generic message, never internal details', async () => {
      const { agent } = await signUp();
      vi.spyOn(Category, 'find').mockImplementation(() => {
        throw new Error('connection string mongodb://secret@db leaked');
      });

      const res = await agent.get('/api/categories').expect(500);
      expect(res.body).toEqual({ error: { message: 'Something went wrong. Please try again.' } });
      expect(JSON.stringify(res.body)).not.toContain('secret');
      expect(console.error).toHaveBeenCalled(); // the details go to the server log instead
    });
  });
});

describe('sessions', () => {
  it('reject expired tokens, other secrets and unsigned tokens', async () => {
    const { user } = await signUp();
    const expired = jwt.sign({ tv: 0 }, process.env.JWT_SECRET, { subject: user.id, expiresIn: -10 });
    const otherSecret = jwt.sign({ tv: 0 }, 'a-different-secret-that-is-also-long-enough', { subject: user.id });
    const unsigned = jwt.sign({ tv: 0 }, null, { subject: user.id, algorithm: 'none' });

    for (const token of [expired, otherSecret, unsigned]) {
      await request(app).get('/api/auth/me').set('Cookie', sessionCookie(token)).expect(401);
    }
  });

  it("stop working once the account is deleted, even if the cookie is kept", async () => {
    const { agent, user } = await signUp();
    const token = jwt.sign({ tv: 0 }, process.env.JWT_SECRET, { subject: user.id, expiresIn: '1h' });
    await agent.delete('/api/auth/me').send({ password: PASSWORD }).expect(204);

    const res = await request(app).get('/api/auth/me').set('Cookie', sessionCookie(token)).expect(401);
    expect(res.headers['set-cookie']?.[0]).toMatch(/^ft_session=;/); // and the stale cookie is cleared
  });

  it('use an HttpOnly, SameSite=Lax cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'cookie@example.com', password: PASSWORD })
      .expect(201);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });
});

describe('cross-site requests (CSRF)', () => {
  it('are refused for every kind of change, even with a valid session', async () => {
    const { agent } = await signUp();
    const tx = await addTransaction(agent, { categoryId: await findCategoryId(agent, 'Groceries') });
    const evil = { Origin: 'https://evil.example' };

    await agent.patch(`/api/transactions/${tx.id}`).set(evil).send({ amountMinor: 1 }).expect(403);
    await agent.delete(`/api/transactions/${tx.id}`).set(evil).expect(403);
    await agent.patch('/api/auth/me').set(evil).send({ name: 'Hacked' }).expect(403);
    await agent.delete('/api/auth/me').set(evil).send({ password: PASSWORD }).expect(403);
    await agent.post('/api/auth/logout').set('Origin', 'null').expect(403);

    expect((await Transaction.findById(tx.id)).amountMinor).toBe(tx.amountMinor);
  });

  it('are allowed from the app itself', async () => {
    const { agent } = await signUp();
    await agent
      .patch('/api/auth/me')
      .set('Host', 'money.example')
      .set('Origin', 'https://money.example')
      .send({ name: 'Renamed' })
      .expect(200);
  });
});

describe('privacy between users', () => {
  it("keeps budgets, reports and trends separate", async () => {
    const { agent } = await signUp('owner@example.com');
    const groceries = await findCategoryId(agent, 'Groceries');
    await addTransaction(agent, { categoryId: groceries, amountMinor: 500000, date: '2026-11-03' });
    await agent.put('/api/budgets').send({ month: '2026-11', categoryId: groceries, limitMinor: 600000 }).expect(200);

    const { agent: other } = await signUp('other@example.com');
    const budgets = await other.get('/api/budgets?month=2026-11').expect(200);
    expect(budgets.body.budgets).toEqual([]);

    const report = await other.get('/api/reports?from=2026-01-01&to=2026-12-31').expect(200);
    expect(report.body.totals.expenseMinor).toBe(0);
    expect(report.body.expenseByPaymentMethod).toEqual([]);

    const trend = await other.get('/api/summary/trend?months=3&end=2026-11').expect(200);
    expect(trend.body.months.every((m) => m.expenseMinor === 0)).toBe(true);

    // Copying "November" copies only your own budgets.
    const copy = await other.post('/api/budgets/copy').send({ fromMonth: '2026-11', toMonth: '2026-12' }).expect(200);
    expect(copy.body.copied).toBe(0);
  });

  it("won't move your transactions into someone else's category", async () => {
    const { agent: owner } = await signUp('owner@example.com');
    const dining = await findCategoryId(owner, 'Dining');
    const tx = await addTransaction(owner, { categoryId: dining });

    const { agent: other } = await signUp('other@example.com');
    const theirs = await findCategoryId(other, 'Other');

    const res = await owner.delete(`/api/categories/${dining}?moveTo=${theirs}`).expect(400);
    expect(res.body.error.details[0]).toEqual({ field: 'moveTo', message: 'Category not found.' });
    expect((await Transaction.findById(tx.id)).categoryId.toString()).toBe(dining);
  });

  it('ignores a userId sent in the request body (mass assignment)', async () => {
    const { agent: victim, user: victimUser } = await signUp('victim@example.com');
    const { agent: attacker, user: attackerUser } = await signUp('attacker@example.com');

    const tx = await addTransaction(attacker, {
      categoryId: await findCategoryId(attacker, 'Groceries'),
      userId: victimUser.id,
    });
    expect((await Transaction.findById(tx.id)).userId.toString()).toBe(attackerUser.id);
    expect((await victim.get('/api/transactions').expect(200)).body.total).toBe(0);

    const category = await attacker
      .post('/api/categories')
      .send({ name: 'Sneaky', type: 'expense', userId: victimUser.id })
      .expect(201);
    expect((await Category.findById(category.body.category.id)).userId.toString()).toBe(attackerUser.id);
  });

  it('never lets an account give itself extra powers', async () => {
    const { agent, user } = await signUp();
    await agent.patch('/api/auth/me').send({ name: 'Me', tokenVersion: 99, passwordHash: 'x', email: 'new@example.com' });
    const stored = await User.findById(user.id).select('+tokenVersion +passwordHash');
    expect(stored.tokenVersion).toBe(0);
    expect(stored.passwordHash).not.toBe('x');
    expect(stored.email).toBe('test.user@example.com');
  });
});

describe('input validation', () => {
  it('never turns query-string text into database operators', async () => {
    const { agent } = await signUp();
    const groceries = await findCategoryId(agent, 'Groceries');
    await addTransaction(agent, { categoryId: groceries });
    await addTransaction(agent, { categoryId: await findCategoryId(agent, 'Dining') });

    // Express 5 keeps "categoryId[$ne]" as a plain, unknown key, which
    // validation drops. Were it read as { $ne: groceries }, only Dining would come back.
    const res = await agent.get(`/api/transactions?categoryId[$ne]=${groceries}`).expect(200);
    expect(res.body.total).toBe(2);

    // A repeated parameter arrives as an array and is refused.
    await agent.get('/api/transactions?type=expense&type=income').expect(400);
  });

  it('rejects amounts that are fractional, negative, text or too large', async () => {
    const { agent } = await signUp();
    const categoryId = await findCategoryId(agent, 'Groceries');
    for (const amountMinor of [10.5, -100, 0, '100', 1e16, Number.MAX_SAFE_INTEGER + 2]) {
      await agent
        .post('/api/transactions')
        .send({ type: 'expense', amountMinor, categoryId, date: '2026-11-01' })
        .expect(400);
    }
    expect(await Transaction.countDocuments()).toBe(0);
  });

  it('limits passwords to what bcrypt actually uses (72 bytes)', async () => {
    // 30 Hindi letters: 30 characters, but 90 bytes.
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'hindi@example.com', password: 'क'.repeat(30) })
      .expect(400);
    expect(res.body.error.details[0].field).toBe('password');

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'ascii@example.com', password: 'a'.repeat(64) })
      .expect(201);
  });
});

describe('rate limits', () => {
  it('slow down guessing the password to delete an account', async () => {
    const { agent } = await signUp();
    for (let i = 0; i < 5; i += 1) {
      await agent.delete('/api/auth/me').send({ password: 'wrong-password' }).expect(401);
    }
    await agent.delete('/api/auth/me').send({ password: PASSWORD }).expect(429);
    await agent.get('/api/auth/me').expect(200); // still there
  });

  it('limit sign-ups from one address', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'A', email: `user${i}@example.com`, password: PASSWORD })
        .expect(201);
    }
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'user5@example.com', password: PASSWORD })
      .expect(429);
  });
});
