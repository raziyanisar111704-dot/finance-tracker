import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { sentEmails } from '../src/services/email.service.js';
import { PASSWORD, signUp } from './helpers.js';

const EMAIL = 'test.user@example.com';
const NEW_PASSWORD = 'a brand new password';

let agent;
beforeEach(async () => {
  ({ agent } = await signUp(EMAIL));
  sentEmails.length = 0;
});
afterEach(() => {
  sentEmails.length = 0;
});

const askForLink = (email = EMAIL, client = request(app)) =>
  client.post('/api/auth/forgot-password').send({ email });

// The token from the last email's link.
function lastToken() {
  const url = /https?:\/\/\S+reset-password\?token=([A-Za-z0-9_-]+)/.exec(sentEmails.at(-1).text);
  return url[1];
}

const reset = (token, password = NEW_PASSWORD) =>
  request(app).post('/api/auth/reset-password').send({ token, password });

describe('POST /api/auth/forgot-password', () => {
  it('emails a one-time link built from APP_URL', async () => {
    const res = await askForLink().expect(200);
    expect(res.body.message).toContain('If an account exists');
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]).toMatchObject({ to: EMAIL, subject: 'Reset your Finance Tracker password' });
    expect(sentEmails[0].text).toMatch(/^Hi Test User,/);
    expect(sentEmails[0].text).toContain('http://localhost:5173/reset-password?token=');
    expect(sentEmails[0].html).toContain('Choose a new password');
    expect(lastToken()).toHaveLength(43);
  });

  it('gives the same answer for an unknown email, and sends nothing', async () => {
    const known = await askForLink().expect(200);
    const unknown = await askForLink('nobody@example.com').expect(200);
    expect(unknown.body).toEqual(known.body);
    expect(sentEmails).toHaveLength(1);
  });

  it('matches the email without regard to capitals or spaces', async () => {
    await askForLink('  Test.User@Example.COM ').expect(200);
    expect(sentEmails).toHaveLength(1);
  });

  it('ignores a forged Host header when building the link', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .set('Host', 'evil.example')
      .set('X-Forwarded-Host', 'evil.example')
      .send({ email: EMAIL })
      .expect(200);
    expect(sentEmails[0].text).not.toContain('evil.example');
    expect(sentEmails[0].text).toContain('http://localhost:5173/');
  });

  it('stores only a hash of the token, with a 30-minute expiry', async () => {
    const before = Date.now();
    await askForLink();
    const user = await User.findOne({ email: EMAIL }).select('+resetTokenHash +resetTokenExpiresAt').lean();
    expect(user.resetTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(user.resetTokenHash).not.toContain(lastToken());
    const minutes = (user.resetTokenExpiresAt.getTime() - before) / 60_000;
    expect(minutes).toBeGreaterThan(29.9);
    expect(minutes).toBeLessThan(30.1);
  });

  it('never returns the reset fields from the API', async () => {
    await askForLink();
    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user).not.toHaveProperty('resetTokenHash');
    expect(me.body.user).not.toHaveProperty('resetTokenExpiresAt');
  });

  it('rejects an invalid email or an injection object', async () => {
    await askForLink('not-an-email').expect(400);
    await request(app).post('/api/auth/forgot-password').send({ email: { $ne: '' } }).expect(400);
    expect(sentEmails).toHaveLength(0);
  });

  it('limits emails per address (3 an hour)', async () => {
    for (let i = 0; i < 3; i += 1) await askForLink().expect(200);
    const res = await askForLink().expect(429);
    expect(res.body.error.message).toContain('Too many reset emails');
    expect(sentEmails).toHaveLength(3);
  });

  it('limits requests per IP (5 an hour), across addresses', async () => {
    for (let i = 0; i < 5; i += 1) await askForLink(`someone${i}@example.com`).expect(200);
    await askForLink('someone-else@example.com').expect(429);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('sets the new password, ends every session, and sends a confirmation', async () => {
    await askForLink();
    const res = await reset(lastToken()).expect(200);
    expect(res.body.message).toContain('password has been changed');

    // old session (logged in before the reset) no longer works
    await agent.get('/api/auth/me').expect(401);
    // old password fails, new one works
    await request(app).post('/api/auth/login').send({ email: EMAIL, password: PASSWORD }).expect(401);
    await request(app).post('/api/auth/login').send({ email: EMAIL, password: NEW_PASSWORD }).expect(200);

    expect(sentEmails.at(-1)).toMatchObject({ to: EMAIL, subject: 'Your Finance Tracker password was changed' });
  });

  it('works only once', async () => {
    await askForLink();
    const token = lastToken();
    await reset(token).expect(200);
    const again = await reset(token, 'yet another password').expect(400);
    expect(again.body.error.message).toContain('invalid, already used or expired');
  });

  it('refuses an expired link', async () => {
    await askForLink();
    await User.updateOne({ email: EMAIL }, { $set: { resetTokenExpiresAt: new Date(Date.now() - 1000) } });
    await reset(lastToken()).expect(400);
  });

  it('only the newest link works', async () => {
    await askForLink();
    const first = lastToken();
    await askForLink();
    const second = lastToken();
    await reset(first).expect(400);
    await reset(second).expect(200);
  });

  it('refuses a made-up or malformed token', async () => {
    await askForLink();
    await reset('A'.repeat(43)).expect(400);
    const res = await reset('short').expect(400);
    expect(res.body.error.details[0]).toMatchObject({ field: 'token' });
    await request(app).post('/api/auth/reset-password').send({ token: { $ne: '' }, password: NEW_PASSWORD }).expect(400);
  });

  it('applies the normal password rules, keeping the link usable', async () => {
    await askForLink();
    const res = await reset(lastToken(), 'short').expect(400);
    expect(res.body.error.details[0]).toMatchObject({ field: 'password', message: expect.stringContaining('at least 10') });
    await reset(lastToken()).expect(200);
  });

  it("a link for one account can't change another account", async () => {
    await signUp('other.user@example.com');
    await askForLink();
    await reset(lastToken()).expect(200);
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'other.user@example.com', password: PASSWORD })
      .expect(200);
  });

  it('lifts the "too many attempts" login lock for that email', async () => {
    for (let i = 0; i < 10; i += 1) {
      await request(app).post('/api/auth/login').send({ email: EMAIL, password: 'wrong password!' });
    }
    await request(app).post('/api/auth/login').send({ email: EMAIL, password: PASSWORD }).expect(429);
    await askForLink();
    await reset(lastToken()).expect(200);
    // The per-IP limit (10) is also used up by the attempts above, so log in
    // from a "different" client IP to see only the per-email lock.
    await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.9')
      .send({ email: EMAIL, password: NEW_PASSWORD })
      .expect(200);
  });
});
