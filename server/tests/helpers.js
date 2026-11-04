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

// Sample data with hand-calculated expected results (in paise):
//   Oct 2026: income 50,00,000 | groceries 4,00,000
//   Nov 2026: income 50,00,000 + 10,00,050 = 60,00,050
//             groceries 4,50,075 + 49,925 = 5,00,000 | dining 1,20,000 | savings 10,00,000
//   Dec 2026: groceries 99,999
export async function seedSampleData(agent) {
  const ids = {};
  for (const name of ['Salary', 'Freelance', 'Groceries', 'Dining', 'Savings', 'Shopping', 'Education']) {
    ids[name.toLowerCase()] = await findCategoryId(agent, name);
  }
  const income = (categoryId, amountMinor, date) =>
    addTransaction(agent, { type: 'income', categoryId, amountMinor, date });
  const expense = (categoryId, amountMinor, date, notes) =>
    addTransaction(agent, { type: 'expense', categoryId, amountMinor, date, notes });

  await income(ids.salary, 5000000, '2026-10-01');
  await expense(ids.groceries, 400000, '2026-10-31');
  await income(ids.salary, 5000000, '2026-11-01');
  await expense(ids.groceries, 450075, '2026-11-05');
  await expense(ids.dining, 120000, '2026-11-10');
  await expense(ids.savings, 1000000, '2026-11-15', 'Monthly SIP');
  await income(ids.freelance, 1000050, '2026-11-20');
  await expense(ids.groceries, 49925, '2026-11-30');
  await expense(ids.groceries, 99999, '2026-12-01');
  return ids;
}

export async function addTransaction(agent, fields) {
  const res = await agent
    .post('/api/transactions')
    .send({ type: 'expense', amountMinor: 1000, date: '2026-11-01', ...fields })
    .expect(201);
  return res.body.transaction;
}
