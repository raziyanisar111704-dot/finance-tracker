import { beforeEach, describe, expect, it } from 'vitest';
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

const expenseRow = (fields = {}) => ({
  type: 'expense',
  amountMinor: 45050,
  categoryId: groceries,
  date: '2026-11-03',
  ...fields,
});

describe('POST /api/transactions/import', () => {
  it('imports every row with one shared import id', async () => {
    const res = await agent
      .post('/api/transactions/import')
      .send({
        rows: [
          expenseRow({ notes: 'BigBasket', paymentMethod: 'upi' }),
          { type: 'income', amountMinor: 5000000, categoryId: salary, date: '2026-11-01' },
        ],
      })
      .expect(201);

    expect(res.body.count).toBe(2);
    expect(res.body.importId).toMatch(/^[0-9a-f-]{36}$/);
    const saved = await Transaction.find({ importId: res.body.importId }).lean();
    expect(saved).toHaveLength(2);
    expect(saved.find((t) => t.type === 'expense')).toMatchObject({ notes: 'BigBasket', paymentMethod: 'upi' });
    expect(saved.find((t) => t.type === 'income')).toMatchObject({ paymentMethod: 'other', notes: '' });
  });

  it('saves nothing when any row is invalid, and names the row', async () => {
    const res = await agent
      .post('/api/transactions/import')
      .send({ rows: [expenseRow(), expenseRow({ date: '2026-02-30' }), expenseRow({ amountMinor: 0 })] })
      .expect(400);

    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        { field: 'rows.1.date', message: expect.stringContaining('real date') },
        { field: 'rows.2.amountMinor', message: expect.stringContaining('greater than zero') },
      ]),
    );
    expect(await Transaction.countDocuments()).toBe(0);
  });

  it('rejects a category of the wrong type, saving nothing', async () => {
    const res = await agent
      .post('/api/transactions/import')
      .send({ rows: [expenseRow(), expenseRow({ categoryId: salary })] })
      .expect(400);
    expect(res.body.error.details).toEqual([
      { field: 'rows.1.categoryId', message: expect.stringContaining('income category') },
    ]);
    expect(await Transaction.countDocuments()).toBe(0);
  });

  it("can't use another user's category", async () => {
    const other = await signUp('other.user@example.com');
    const theirs = await findCategoryId(other.agent, 'Groceries');
    const res = await agent
      .post('/api/transactions/import')
      .send({ rows: [expenseRow({ categoryId: theirs })] })
      .expect(400);
    expect(res.body.error.details[0]).toMatchObject({ field: 'rows.0.categoryId', message: 'Category not found.' });
  });

  it('ignores a userId or importId sent in the rows', async () => {
    const other = await signUp('other.user@example.com');
    const res = await agent
      .post('/api/transactions/import')
      .send({ rows: [expenseRow({ userId: other.user.id, importId: 'mine' })] })
      .expect(201);
    const saved = await Transaction.findOne({ importId: res.body.importId }).lean();
    expect(saved.userId.toString()).not.toBe(other.user.id);
    expect((await other.agent.get('/api/transactions').expect(200)).body.total).toBe(0);
  });

  it('refuses empty and oversized imports', async () => {
    await agent.post('/api/transactions/import').send({ rows: [] }).expect(400);
    const tooMany = Array.from({ length: 2001 }, () => expenseRow());
    const res = await agent.post('/api/transactions/import').send({ rows: tooMany }).expect(400);
    expect(res.body.error.details[0].message).toContain('at most 2000 rows');
  });

  it('accepts 2,000 rows with long notes (more than the usual 1 MB body limit)', async () => {
    const rows = Array.from({ length: 2000 }, (_, i) =>
      expenseRow({ amountMinor: i + 1, notes: 'x'.repeat(500) }),
    );
    const res = await agent.post('/api/transactions/import').send({ rows }).expect(201);
    expect(res.body.count).toBe(2000);
  });

  it('allows 20 imports per hour per user', async () => {
    for (let i = 0; i < 20; i += 1) {
      await agent.post('/api/transactions/import').send({ rows: [expenseRow()] }).expect(201);
    }
    const res = await agent.post('/api/transactions/import').send({ rows: [expenseRow()] }).expect(429);
    expect(res.body.error.message).toContain('20 files');
  });
});

describe('POST /api/transactions/import/check', () => {
  it('flags rows that match an existing transaction by date, type and amount', async () => {
    await addTransaction(agent, { categoryId: groceries, amountMinor: 45050, date: '2026-11-03' });
    const res = await agent
      .post('/api/transactions/import/check')
      .send({
        rows: [
          { type: 'expense', amountMinor: 45050, date: '2026-11-03' }, // duplicate
          { type: 'expense', amountMinor: 45051, date: '2026-11-03' }, // other amount
          { type: 'income', amountMinor: 45050, date: '2026-11-03' }, // other type
          { type: 'expense', amountMinor: 45050, date: '2026-11-04' }, // other date
        ],
      })
      .expect(200);
    expect(res.body.duplicates).toEqual([0]);
  });

  it("never matches another user's transactions", async () => {
    const other = await signUp('other.user@example.com');
    await addTransaction(other.agent, {
      categoryId: await findCategoryId(other.agent, 'Groceries'),
      amountMinor: 45050,
      date: '2026-11-03',
    });
    const res = await agent
      .post('/api/transactions/import/check')
      .send({ rows: [{ type: 'expense', amountMinor: 45050, date: '2026-11-03' }] })
      .expect(200);
    expect(res.body.duplicates).toEqual([]);
  });
});

describe('DELETE /api/transactions/import/:importId', () => {
  it('removes exactly the rows of that import', async () => {
    const kept = await addTransaction(agent, { categoryId: groceries });
    const first = await agent.post('/api/transactions/import').send({ rows: [expenseRow(), expenseRow()] });
    const second = await agent.post('/api/transactions/import').send({ rows: [expenseRow()] });

    const res = await agent.delete(`/api/transactions/import/${first.body.importId}`).expect(200);
    expect(res.body.deleted).toBe(2);
    const left = await Transaction.find().lean();
    expect(left.map((t) => t._id.toString()).sort()).toEqual(
      [kept.id, (await Transaction.findOne({ importId: second.body.importId }))._id.toString()].sort(),
    );
    await agent.delete(`/api/transactions/import/${first.body.importId}`).expect(404);
  });

  it("can't undo another user's import", async () => {
    const other = await signUp('other.user@example.com');
    const theirGroceries = await findCategoryId(other.agent, 'Groceries');
    const theirs = await other.agent
      .post('/api/transactions/import')
      .send({ rows: [expenseRow({ categoryId: theirGroceries })] })
      .expect(201);
    await agent.delete(`/api/transactions/import/${theirs.body.importId}`).expect(404);
    expect(await Transaction.countDocuments({ importId: theirs.body.importId })).toBe(1);
  });

  it('rejects a malformed import id', async () => {
    await agent.delete('/api/transactions/import/not-a-uuid').expect(400);
  });
});
