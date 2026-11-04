import { beforeEach, describe, expect, it } from 'vitest';
import { Budget } from '../src/models/Budget.js';
import { seedSampleData, signUp } from './helpers.js';

let agent;
let ids;

const setBudget = (categoryId, month, limitMinor) =>
  agent.put('/api/budgets').send({ categoryId, month, limitMinor });

beforeEach(async () => {
  ({ agent } = await signUp());
  ids = await seedSampleData(agent);
});

describe('PUT /api/budgets', () => {
  it('creates a budget, then updates the same one', async () => {
    const created = await setBudget(ids.groceries, '2026-11', 500000).expect(200);
    expect(created.body.budget).toMatchObject({ categoryId: ids.groceries, month: '2026-11', limitMinor: 500000 });

    await setBudget(ids.groceries, '2026-11', 600000).expect(200);
    const budgets = await Budget.find({ categoryId: ids.groceries, month: '2026-11' });
    expect(budgets).toHaveLength(1);
    expect(budgets[0].limitMinor).toBe(600000);
  });

  it('only accepts your own, active expense categories and positive whole amounts', async () => {
    await setBudget(ids.salary, '2026-11', 100000).expect(400);
    await setBudget(ids.groceries, '2026-11', 0).expect(400);
    await setBudget(ids.groceries, '2026-11', 99.5).expect(400);
    await setBudget(ids.groceries, '2026-13', 1000).expect(400);

    await agent.patch(`/api/categories/${ids.education}`).send({ archived: true }).expect(200);
    await setBudget(ids.education, '2026-11', 1000).expect(400);

    const { agent: other } = await signUp('other.user@example.com');
    await other
      .put('/api/budgets')
      .send({ categoryId: ids.groceries, month: '2026-11', limitMinor: 1000 })
      .expect(400);
  });
});

describe('GET /api/budgets', () => {
  beforeEach(async () => {
    await setBudget(ids.groceries, '2026-10', 450000).expect(200);
    await setBudget(ids.groceries, '2026-11', 500000).expect(200);
    await setBudget(ids.dining, '2026-11', 100000).expect(200);
    await setBudget(ids.shopping, '2026-11', 100000).expect(200);
  });

  it('shows spending, remaining amount and status per budget', async () => {
    const res = await agent.get('/api/budgets?month=2026-11').expect(200);
    const view = res.body.budgets.map(({ name, limitMinor, spentMinor, remainingMinor, percentUsed, status }) => ({
      name,
      limitMinor,
      spentMinor,
      remainingMinor,
      percentUsed,
      status,
    }));
    expect(view).toEqual([
      // Spent 1,20,000 of 1,00,000
      { name: 'Dining', limitMinor: 100000, spentMinor: 120000, remainingMinor: -20000, percentUsed: 120, status: 'exceeded' },
      // Spent exactly the budget: 4,50,075 + 49,925 = 5,00,000
      { name: 'Groceries', limitMinor: 500000, spentMinor: 500000, remainingMinor: 0, percentUsed: 100, status: 'warning' },
      { name: 'Shopping', limitMinor: 100000, spentMinor: 0, remainingMinor: 100000, percentUsed: 0, status: 'ok' },
    ]);
    expect(res.body.totals).toEqual({
      limitMinor: 700000,
      spentMinor: 620000,
      remainingMinor: 80000,
      percentUsed: 88.6,
    });
  });

  it("includes last month's budget and spending for comparison", async () => {
    const res = await agent.get('/api/budgets?month=2026-11').expect(200);
    const groceries = res.body.budgets.find((b) => b.name === 'Groceries');
    const dining = res.body.budgets.find((b) => b.name === 'Dining');
    expect(groceries.previous).toEqual({ limitMinor: 450000, spentMinor: 400000 });
    expect(dining.previous).toEqual({ limitMinor: null, spentMinor: 0 });
  });

  it('uses exactly the same spending figure as the dashboard', async () => {
    const budgets = await agent.get('/api/budgets?month=2026-11').expect(200);
    const summary = await agent.get('/api/summary/month?month=2026-11').expect(200);
    const groceriesBudget = budgets.body.budgets.find((b) => b.name === 'Groceries');
    const groceriesSummary = summary.body.expenseByCategory.find((c) => c.name === 'Groceries');
    expect(groceriesBudget.spentMinor).toBe(groceriesSummary.totalMinor);
  });

  it('returns an empty list for a month without budgets', async () => {
    const res = await agent.get('/api/budgets?month=2030-01').expect(200);
    expect(res.body).toEqual({
      month: '2030-01',
      budgets: [],
      totals: { limitMinor: 0, spentMinor: 0, remainingMinor: 0, percentUsed: null },
    });
  });
});

describe('POST /api/budgets/copy', () => {
  beforeEach(async () => {
    await setBudget(ids.groceries, '2026-10', 450000).expect(200);
    await setBudget(ids.dining, '2026-10', 90000).expect(200);
    await setBudget(ids.education, '2026-10', 200000).expect(200);
    await setBudget(ids.groceries, '2026-11', 500000).expect(200);
    await agent.patch(`/api/categories/${ids.education}`).send({ archived: true }).expect(200);
  });

  const novemberLimits = async () => {
    const res = await agent.get('/api/budgets?month=2026-11').expect(200);
    return Object.fromEntries(res.body.budgets.map((b) => [b.name, b.limitMinor]));
  };

  it('adds missing budgets, keeps existing ones and skips archived categories', async () => {
    const res = await agent.post('/api/budgets/copy').send({ fromMonth: '2026-10', toMonth: '2026-11' }).expect(200);
    expect(res.body).toEqual({ copied: 1, skipped: 2 });
    expect(await novemberLimits()).toEqual({ Dining: 90000, Groceries: 500000 });
  });

  it('replaces existing budgets when overwrite is true', async () => {
    await agent
      .post('/api/budgets/copy')
      .send({ fromMonth: '2026-10', toMonth: '2026-11', overwrite: true })
      .expect(200);
    expect(await novemberLimits()).toEqual({ Dining: 90000, Groceries: 450000 });
  });

  it('rejects copying a month onto itself', async () => {
    await agent.post('/api/budgets/copy').send({ fromMonth: '2026-10', toMonth: '2026-10' }).expect(400);
  });
});

describe('DELETE /api/budgets/:id', () => {
  it("deletes your budget but not another user's", async () => {
    const created = await setBudget(ids.groceries, '2026-11', 500000).expect(200);
    const id = created.body.budget.id;

    const { agent: other } = await signUp('other.user@example.com');
    await other.delete(`/api/budgets/${id}`).expect(404);

    await agent.delete(`/api/budgets/${id}`).expect(204);
    expect(await Budget.countDocuments()).toBe(0);
  });
});
