import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { Transaction } from '../src/models/Transaction.js';
import { addTransaction, findCategoryId, signUp } from './helpers.js';

let agent;
let groceries;
let salary;

beforeEach(async () => {
  ({ agent } = await signUp());
  groceries = await findCategoryId(agent, 'Groceries');
  salary = await findCategoryId(agent, 'Salary');
});

describe('POST /api/transactions', () => {
  it('creates an expense with defaults for optional fields', async () => {
    const res = await agent
      .post('/api/transactions')
      .send({ type: 'expense', amountMinor: 45050, categoryId: groceries, date: '2026-11-03' })
      .expect(201);
    expect(res.body.transaction).toMatchObject({
      type: 'expense',
      amountMinor: 45050,
      categoryId: groceries,
      date: '2026-11-03',
      paymentMethod: 'other',
      notes: '',
      isRecurring: false,
    });
    expect(res.body.transaction).not.toHaveProperty('userId');
  });

  it.each([
    ['amountMinor', 10.5, 'whole paise'],
    ['amountMinor', 0, 'greater than zero'],
    ['amountMinor', -500, 'greater than zero'],
    ['amountMinor', '100', 'must be a number'],
    ['date', '2026-02-30', 'real date'],
    ['date', '30-01-2026', 'real date'],
    ['paymentMethod', 'bitcoin', 'valid payment method'],
    ['type', 'transfer', 'income or expense'],
    ['categoryId', 'not-an-id', 'Invalid category'],
  ])('rejects %s = %j', async (field, value, message) => {
    const body = { type: 'expense', amountMinor: 1000, categoryId: groceries, date: '2026-11-01' };
    const res = await agent
      .post('/api/transactions')
      .send({ ...body, [field]: value })
      .expect(400);
    expect(res.body.error.details).toContainEqual({
      field,
      message: expect.stringContaining(message),
    });
  });

  it('rejects a category of the wrong type', async () => {
    const res = await agent
      .post('/api/transactions')
      .send({ type: 'expense', amountMinor: 1000, categoryId: salary, date: '2026-11-01' })
      .expect(400);
    expect(res.body.error.details[0]).toMatchObject({
      field: 'categoryId',
      message: expect.stringContaining('income category'),
    });
  });

  it('rejects an archived category for new transactions', async () => {
    await agent.patch(`/api/categories/${groceries}`).send({ archived: true }).expect(200);
    const res = await agent
      .post('/api/transactions')
      .send({ type: 'expense', amountMinor: 1000, categoryId: groceries, date: '2026-11-01' })
      .expect(400);
    expect(res.body.error.details[0].message).toMatch(/archived/);
  });
});

describe('GET /api/transactions', () => {
  beforeEach(async () => {
    await addTransaction(agent, { categoryId: groceries, amountMinor: 10, date: '2026-10-31', notes: 'Big Bazaar' });
    await addTransaction(agent, { categoryId: groceries, amountMinor: 20, date: '2026-11-01', notes: 'Milk and bread' });
    await addTransaction(agent, { type: 'income', categoryId: salary, amountMinor: 5000000, date: '2026-11-15', notes: 'November salary', paymentMethod: 'bank_transfer' });
    await addTransaction(agent, { categoryId: groceries, amountMinor: 70, date: '2026-11-30', notes: 'Vegetables', paymentMethod: 'upi' });
    await addTransaction(agent, { categoryId: groceries, amountMinor: 999, date: '2026-12-01' });
  });

  it('returns newest first with exact totals for all matches', async () => {
    const res = await agent.get('/api/transactions').expect(200);
    expect(res.body.items.map((t) => t.date)).toEqual([
      '2026-12-01',
      '2026-11-30',
      '2026-11-15',
      '2026-11-01',
      '2026-10-31',
    ]);
    expect(res.body.totals).toEqual({ incomeMinor: 5000000, expenseMinor: 1099 });
  });

  it('includes both ends of a date range (month boundaries)', async () => {
    const res = await agent.get('/api/transactions?from=2026-11-01&to=2026-11-30').expect(200);
    expect(res.body.items.map((t) => t.date)).toEqual(['2026-11-30', '2026-11-15', '2026-11-01']);
    expect(res.body.totals).toEqual({ incomeMinor: 5000000, expenseMinor: 90 });
  });

  it('filters by type, category and payment method', async () => {
    const income = await agent.get('/api/transactions?type=income').expect(200);
    expect(income.body.total).toBe(1);
    expect(income.body.totals).toEqual({ incomeMinor: 5000000, expenseMinor: 0 });

    const byCategory = await agent.get(`/api/transactions?categoryId=${groceries}`).expect(200);
    expect(byCategory.body.total).toBe(4);

    const upi = await agent.get('/api/transactions?paymentMethod=upi').expect(200);
    expect(upi.body.items.map((t) => t.notes)).toEqual(['Vegetables']);
  });

  it('searches notes case-insensitively and treats symbols literally', async () => {
    const res = await agent.get('/api/transactions?q=MILK').expect(200);
    expect(res.body.items.map((t) => t.notes)).toEqual(['Milk and bread']);

    const symbols = await agent.get('/api/transactions?q=(.*').expect(200);
    expect(symbols.body.total).toBe(0);
  });

  it('paginates', async () => {
    const res = await agent.get('/api/transactions?limit=2&page=2').expect(200);
    expect(res.body).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(res.body.items.map((t) => t.date)).toEqual(['2026-11-15', '2026-11-01']);
  });

  it('returns an empty list with zero totals when nothing matches', async () => {
    const res = await agent.get('/api/transactions?from=2030-01-01').expect(200);
    expect(res.body).toMatchObject({ items: [], total: 0, totalPages: 1 });
    expect(res.body.totals).toEqual({ incomeMinor: 0, expenseMinor: 0 });
  });

  it('rejects invalid filters', async () => {
    await agent.get('/api/transactions?from=2026-11-30&to=2026-11-01').expect(400);
    await agent.get('/api/transactions?limit=500').expect(400);
    await agent.get('/api/transactions?from=yesterday').expect(400);
  });
});

describe('PATCH and DELETE /api/transactions/:id', () => {
  it('updates fields', async () => {
    const tx = await addTransaction(agent, { categoryId: groceries });
    const res = await agent
      .patch(`/api/transactions/${tx.id}`)
      .send({ amountMinor: 123456, notes: 'Monthly stock-up', date: '2026-11-02' })
      .expect(200);
    expect(res.body.transaction).toMatchObject({ amountMinor: 123456, notes: 'Monthly stock-up', date: '2026-11-02' });
  });

  it('keeps type and category consistent', async () => {
    const tx = await addTransaction(agent, { categoryId: groceries });
    await agent.patch(`/api/transactions/${tx.id}`).send({ type: 'income' }).expect(400);
    await agent.patch(`/api/transactions/${tx.id}`).send({ categoryId: salary }).expect(400);

    const res = await agent
      .patch(`/api/transactions/${tx.id}`)
      .send({ type: 'income', categoryId: salary })
      .expect(200);
    expect(res.body.transaction).toMatchObject({ type: 'income', categoryId: salary });
  });

  it('allows editing a transaction whose category was archived later', async () => {
    const tx = await addTransaction(agent, { categoryId: groceries });
    await agent.patch(`/api/categories/${groceries}`).send({ archived: true }).expect(200);
    await agent.patch(`/api/transactions/${tx.id}`).send({ amountMinor: 2000 }).expect(200);
  });

  it('deletes a transaction', async () => {
    const tx = await addTransaction(agent, { categoryId: groceries });
    await agent.delete(`/api/transactions/${tx.id}`).expect(204);
    await agent.get(`/api/transactions/${tx.id}`).expect(404);
    await agent.delete(`/api/transactions/${tx.id}`).expect(404);
  });

  it('rejects malformed ids', async () => {
    await agent.get('/api/transactions/12345').expect(400);
  });
});

describe('privacy between users', () => {
  it("one user can't read, change, delete or reuse another user's data", async () => {
    const tx = await addTransaction(agent, { categoryId: groceries, amountMinor: 777 });
    const { agent: other } = await signUp('other.user@example.com');

    const list = await other.get('/api/transactions').expect(200);
    expect(list.body.total).toBe(0);

    await other.get(`/api/transactions/${tx.id}`).expect(404);
    await other.patch(`/api/transactions/${tx.id}`).send({ amountMinor: 1 }).expect(404);
    await other.delete(`/api/transactions/${tx.id}`).expect(404);

    // Attaching a transaction to someone else's category is refused too.
    const res = await other
      .post('/api/transactions')
      .send({ type: 'expense', amountMinor: 100, categoryId: groceries, date: '2026-11-01' })
      .expect(400);
    expect(res.body.error.details[0].message).toBe('Category not found.');

    expect((await Transaction.findById(tx.id)).amountMinor).toBe(777);
  });

  it('requires login', async () => {
    await request(app).get('/api/transactions').expect(401);
    await request(app).get('/api/categories').expect(401);
  });
});
