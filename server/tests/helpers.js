import request from 'supertest';
import app from '../src/app.js';

export const PASSWORD = 'correct-horse-battery';

// Registers a user and returns a cookie-keeping agent (acts like a browser).
export async function signUp(email = 'test.user@example.com') {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: PASSWORD })
    .expect(201);
  return { agent, user: res.body.user };
}

export async function findCategoryId(agent, name) {
  const res = await agent.get('/api/categories?includeArchived=true').expect(200);
  const category = res.body.categories.find((c) => c.name === name);
  if (!category) throw new Error(`Test setup: category "${name}" not found`);
  return category.id;
}

export async function addTransaction(agent, fields) {
  const res = await agent
    .post('/api/transactions')
    .send({ type: 'expense', amountMinor: 1000, date: '2026-11-01', ...fields })
    .expect(201);
  return res.body.transaction;
}
