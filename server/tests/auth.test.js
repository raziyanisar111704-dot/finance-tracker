import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { Category } from '../src/models/Category.js';
import { User } from '../src/models/User.js';

const VALID_USER = {
  name: 'Test User',
  email: 'test.user@example.com',
  password: 'correct-horse-battery',
};

// An "agent" keeps cookies between requests, like a browser does.
async function registeredAgent(body = VALID_USER) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send(body).expect(201);
  return { agent, res };
}

describe('POST /api/auth/register', () => {
  it('creates the user, seeds default categories and sets a secure session cookie', async () => {
    const { res } = await registeredAgent();

    expect(res.body.user).toMatchObject({
      name: 'Test User',
      email: 'test.user@example.com',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      openingBalanceMinor: 0,
    });
    expect(res.body.user.id).toBeTypeOf('string');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('tokenVersion');

    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^ft_session=/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');

    const categories = await Category.find({ userId: res.body.user.id });
    expect(categories).toHaveLength(17);
    expect(categories.filter((c) => c.isSavings).map((c) => c.name).sort()).toEqual([
      'Investments',
      'Savings',
    ]);
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    await registeredAgent();
    const user = await User.findOne({ email: VALID_USER.email }).select('+passwordHash');
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(user.passwordHash).not.toContain(VALID_USER.password);
  });

  it('rejects a duplicate email, ignoring case and spaces', async () => {
    await registeredAgent();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, email: '  TEST.User@Example.com ' })
      .expect(409);
    expect(res.body.error.message).toMatch(/already exists/);
  });

  it('returns field-level validation errors', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'short' })
      .expect(400);
    const fields = res.body.error.details.map((d) => d.field).sort();
    expect(fields).toEqual(['email', 'name', 'password']);
  });

  it('requires a JSON body', async () => {
    await request(app)
      .post('/api/auth/register')
      .type('form')
      .send('name=a&email=a@b.com&password=1234567890')
      .expect(415);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await registeredAgent();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password })
      .expect(200);
    expect(res.body.user.email).toBe(VALID_USER.email);
    expect(res.headers['set-cookie'][0]).toMatch(/^ft_session=/);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    await registeredAgent();
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'wrong-password' })
      .expect(401);
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' })
      .expect(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('blocks NoSQL injection attempts', async () => {
    await registeredAgent();
    await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } })
      .expect(400);
  });

  it('rate-limits repeated attempts', async () => {
    for (let i = 0; i < 10; i += 1) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'victim@example.com', password: 'guess' })
        .expect(401);
    }
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'victim@example.com', password: 'guess' })
      .expect(429);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('refuses requests sent from another website', async () => {
    await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: VALID_USER.email, password: VALID_USER.password })
      .expect(403);
  });
});

describe('session endpoints', () => {
  it('GET /me requires a session', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });

  it('GET /me returns the logged-in user', async () => {
    const { agent } = await registeredAgent();
    const res = await agent.get('/api/auth/me').expect(200);
    expect(res.body.user.email).toBe(VALID_USER.email);
  });

  it('rejects a forged token', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'ft_session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.forged')
      .expect(401);
  });

  it('logout clears the cookie', async () => {
    const { agent } = await registeredAgent();
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('logout-all invalidates tokens issued earlier', async () => {
    const { agent, res } = await registeredAgent();
    const oldCookie = res.headers['set-cookie'][0].split(';')[0];

    await agent.post('/api/auth/logout-all').expect(204);
    await request(app).get('/api/auth/me').set('Cookie', oldCookie).expect(401);
  });
});

describe('PATCH /api/auth/me', () => {
  it('updates settings and normalises the currency code', async () => {
    const { agent } = await registeredAgent();
    const res = await agent
      .patch('/api/auth/me')
      .send({ currency: 'usd', timezone: 'Europe/London', openingBalanceMinor: 1250050 })
      .expect(200);
    expect(res.body.user).toMatchObject({
      currency: 'USD',
      timezone: 'Europe/London',
      openingBalanceMinor: 1250050,
    });
  });

  it('rejects invalid values and ignores fields that cannot be changed', async () => {
    const { agent } = await registeredAgent();
    await agent.patch('/api/auth/me').send({ timezone: 'Mars/Olympus' }).expect(400);
    await agent.patch('/api/auth/me').send({ openingBalanceMinor: 10.5 }).expect(400);
    const res = await agent.patch('/api/auth/me').send({ email: 'new@example.com' }).expect(400);
    expect(res.body.error.details[0].message).toBe('Nothing to update.');
  });
});

describe('DELETE /api/auth/me', () => {
  it('keeps the account when the password is wrong', async () => {
    const { agent } = await registeredAgent();
    await agent.delete('/api/auth/me').send({ password: 'wrong-password' }).expect(401);
    expect(await User.countDocuments()).toBe(1);
  });

  it('deletes the account and all its data', async () => {
    const { agent, res } = await registeredAgent();
    await agent.delete('/api/auth/me').send({ password: VALID_USER.password }).expect(204);

    expect(await User.countDocuments()).toBe(0);
    expect(await Category.countDocuments({ userId: res.body.user.id })).toBe(0);
    await agent.get('/api/auth/me').expect(401);
  });
});
