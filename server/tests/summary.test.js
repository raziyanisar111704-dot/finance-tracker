import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seedSampleData, signUp } from './helpers.js';

let agent;

// Freeze "now" so results don't depend on the day the tests run.
// Only Date is faked; real timers keep the database driver working.
function setNow(isoInstant) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(isoInstant));
}

beforeEach(async () => {
  setNow('2026-12-15T06:00:00Z');
  ({ agent } = await signUp());
  await seedSampleData(agent);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/summary/month', () => {
  it('calculates the month totals exactly', async () => {
    const res = await agent.get('/api/summary/month?month=2026-11').expect(200);
    expect(res.body).toMatchObject({ month: '2026-11', from: '2026-11-01', to: '2026-11-30' });
    expect(res.body.totals).toEqual({
      incomeMinor: 6000050,
      expenseMinor: 1620000, // 5,00,000 groceries + 1,20,000 dining + 10,00,000 savings
      spendingMinor: 620000, // savings transfers are not "spending"
      savedMinor: 1000000,
      netMinor: 4380050, // income − all outflows
      totalSavingsMinor: 5380050, // income − spending
      savingsRate: 89.7, // 53,80,050 / 60,00,050 = 89.666…%
    });
  });

  it('compares with the previous month', async () => {
    const res = await agent.get('/api/summary/month?month=2026-11').expect(200);
    expect(res.body.previous.month).toBe('2026-10');
    expect(res.body.previous.totals).toMatchObject({
      incomeMinor: 5000000,
      spendingMinor: 400000,
      totalSavingsMinor: 4600000,
      savingsRate: 92,
    });
    expect(res.body.change).toEqual({
      incomePercent: 20, // +20.001%
      spendingPercent: 55, // 6,20,000 vs 4,00,000
      totalSavingsPercent: 17, // 53,80,050 vs 46,00,000 = +16.957%
    });
  });

  it('breaks spending down by category, largest first', async () => {
    const res = await agent.get('/api/summary/month?month=2026-11').expect(200);
    expect(
      res.body.expenseByCategory.map(({ name, totalMinor, count, percentOfTotal }) => ({
        name,
        totalMinor,
        count,
        percentOfTotal,
      })),
    ).toEqual([
      { name: 'Savings', totalMinor: 1000000, count: 1, percentOfTotal: 61.7 },
      { name: 'Groceries', totalMinor: 500000, count: 2, percentOfTotal: 30.9 },
      { name: 'Dining', totalMinor: 120000, count: 1, percentOfTotal: 7.4 },
    ]);
    expect(res.body.incomeByCategory.map((c) => c.name)).toEqual(['Salary', 'Freelance']);
  });

  it('matches the transaction list totals for the same dates', async () => {
    const summary = await agent.get('/api/summary/month?month=2026-11').expect(200);
    const list = await agent.get('/api/transactions?from=2026-11-01&to=2026-11-30').expect(200);
    expect(list.body.totals).toEqual({
      incomeMinor: summary.body.totals.incomeMinor,
      expenseMinor: summary.body.totals.expenseMinor,
    });
  });

  it('gives the balance at the end of a past month, including the opening balance', async () => {
    let res = await agent.get('/api/summary/month?month=2026-11').expect(200);
    // income 1,10,00,050 − expenses 20,20,000 up to 30 Nov
    expect(res.body.balance).toEqual({ asOf: '2026-11-30', balanceMinor: 8980050 });

    await agent.patch('/api/auth/me').send({ openingBalanceMinor: 100000 }).expect(200);
    res = await agent.get('/api/summary/month?month=2026-11').expect(200);
    expect(res.body.balance.balanceMinor).toBe(9080050);
  });

  it('defaults to the current month in the user time zone, with the balance as of today', async () => {
    // 20:00 UTC on 9 Nov = 01:30 IST on 10 Nov
    setNow('2026-11-09T20:00:00Z');
    const res = await agent.get('/api/summary/month').expect(200);
    expect(res.body).toMatchObject({ month: '2026-11', today: '2026-11-10' });
    // Up to 10 Nov: income 1,00,00,000 − (4,00,000 + 4,50,075 + 1,20,000)
    expect(res.body.balance).toEqual({ asOf: '2026-11-10', balanceMinor: 9029925 });
  });

  it('lists the 5 most recent transactions up to the end of the month', async () => {
    const res = await agent.get('/api/summary/month?month=2026-11').expect(200);
    expect(res.body.recentTransactions.map((t) => t.date)).toEqual([
      '2026-11-30',
      '2026-11-20',
      '2026-11-15',
      '2026-11-10',
      '2026-11-05',
    ]);
  });

  it('handles a month with no data without errors', async () => {
    const res = await agent.get('/api/summary/month?month=2030-01').expect(200);
    expect(res.body.totals).toEqual({
      incomeMinor: 0,
      expenseMinor: 0,
      spendingMinor: 0,
      savedMinor: 0,
      netMinor: 0,
      totalSavingsMinor: 0,
      savingsRate: null,
    });
    expect(res.body.change).toEqual({ incomePercent: null, spendingPercent: null, totalSavingsPercent: null });
    expect(res.body.expenseByCategory).toEqual([]);
  });

  it('rejects an invalid month', async () => {
    await agent.get('/api/summary/month?month=2026-13').expect(400);
    await agent.get('/api/summary/month?month=November').expect(400);
  });
});

describe('GET /api/summary/trend', () => {
  it('returns one entry per month, including empty months', async () => {
    const res = await agent.get('/api/summary/trend?months=4&end=2027-01').expect(200);
    expect(
      res.body.months.map(({ month, incomeMinor, expenseMinor, savingsRate }) => ({
        month,
        incomeMinor,
        expenseMinor,
        savingsRate,
      })),
    ).toEqual([
      { month: '2026-10', incomeMinor: 5000000, expenseMinor: 400000, savingsRate: 92 },
      { month: '2026-11', incomeMinor: 6000050, expenseMinor: 1620000, savingsRate: 89.7 },
      { month: '2026-12', incomeMinor: 0, expenseMinor: 99999, savingsRate: null },
      { month: '2027-01', incomeMinor: 0, expenseMinor: 0, savingsRate: null },
    ]);
  });

  it('defaults to the last 6 months ending this month', async () => {
    const res = await agent.get('/api/summary/trend').expect(200);
    expect(res.body.months.map((m) => m.month)).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
    ]);
  });

  it('limits the number of months', async () => {
    await agent.get('/api/summary/trend?months=25').expect(400);
  });
});

describe('GET /api/reports', () => {
  it('reports on a custom range that cuts across months', async () => {
    const res = await agent.get('/api/reports?from=2026-10-15&to=2026-11-15').expect(200);
    // Includes 31 Oct groceries; excludes 1 Oct salary and everything after 15 Nov.
    expect(res.body.totals).toMatchObject({ incomeMinor: 5000000, expenseMinor: 1970075 });
    expect(
      res.body.byMonth.map(({ month, incomeMinor, expenseMinor }) => ({ month, incomeMinor, expenseMinor })),
    ).toEqual([
      { month: '2026-10', incomeMinor: 0, expenseMinor: 400000 },
      { month: '2026-11', incomeMinor: 5000000, expenseMinor: 1570075 },
    ]);
    expect(res.body.expenseByPaymentMethod).toEqual([
      { paymentMethod: 'other', totalMinor: 1970075, count: 4 },
    ]);
  });

  it('works as a yearly report', async () => {
    const res = await agent.get('/api/reports?from=2026-01-01&to=2026-12-31').expect(200);
    expect(res.body.byMonth).toHaveLength(12);
    expect(res.body.totals).toMatchObject({ incomeMinor: 11000050, expenseMinor: 2119999 });
  });

  it('validates the range', async () => {
    await agent.get('/api/reports?from=2026-11-01').expect(400);
    await agent.get('/api/reports?from=2026-11-30&to=2026-11-01').expect(400);
    await agent.get('/api/reports?from=2010-01-01&to=2026-12-31').expect(400);
  });
});

describe('privacy', () => {
  it("another user's summary contains none of this user's money", async () => {
    const { agent: other } = await signUp('other.user@example.com');
    const res = await other.get('/api/summary/month?month=2026-11').expect(200);
    expect(res.body.totals.incomeMinor).toBe(0);
    expect(res.body.recentTransactions).toEqual([]);
    expect(res.body.balance.balanceMinor).toBe(0);
  });
});
