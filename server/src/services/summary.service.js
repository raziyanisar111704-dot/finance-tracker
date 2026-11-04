import { Types } from 'mongoose';
import { Category } from '../models/Category.js';
import { Transaction } from '../models/Transaction.js';
import { monthRange } from '../utils/dates.js';
import { percent } from '../utils/money.js';

// The single source of truth for money totals. Dashboard, budgets, trends and
// reports all use these functions, so their numbers always agree.

export async function loadCategoryMap(userId) {
  const categories = await Category.find({ userId }).lean();
  return new Map(categories.map((category) => [category._id.toString(), category]));
}

// aggregate() doesn't convert types automatically, hence the explicit ObjectId.
function matchStage(userId, from, to) {
  const match = { userId: new Types.ObjectId(userId) };
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lte = to;
  }
  return { $match: match };
}

// One row per (type, category) with its exact integer total.
export async function sumByCategory(userId, from, to) {
  const rows = await Transaction.aggregate([
    matchStage(userId, from, to),
    {
      $group: {
        _id: { type: '$type', categoryId: '$categoryId' },
        totalMinor: { $sum: '$amountMinor' },
        count: { $sum: 1 },
      },
    },
  ]);
  return rows.map(({ _id, totalMinor, count }) => ({
    type: _id.type,
    categoryId: _id.categoryId.toString(),
    totalMinor,
    count,
  }));
}

// Same as sumByCategory, split by month ("YYYY-MM" = first 7 characters of the date).
async function sumByMonthAndCategory(userId, from, to) {
  const rows = await Transaction.aggregate([
    matchStage(userId, from, to),
    {
      $group: {
        _id: { month: { $substrBytes: ['$date', 0, 7] }, type: '$type', categoryId: '$categoryId' },
        totalMinor: { $sum: '$amountMinor' },
        count: { $sum: 1 },
      },
    },
  ]);
  return rows.map(({ _id, totalMinor, count }) => ({
    month: _id.month,
    type: _id.type,
    categoryId: _id.categoryId.toString(),
    totalMinor,
    count,
  }));
}

// Turns category rows into the headline numbers (definitions: ARCHITECTURE.md §6).
export function computeTotals(rows, categoryMap) {
  let incomeMinor = 0;
  let expenseMinor = 0;
  let savedMinor = 0;

  for (const row of rows) {
    if (row.type === 'income') {
      incomeMinor += row.totalMinor;
    } else {
      expenseMinor += row.totalMinor;
      if (categoryMap.get(row.categoryId)?.isSavings) savedMinor += row.totalMinor;
    }
  }

  const spendingMinor = expenseMinor - savedMinor;
  const totalSavingsMinor = incomeMinor - spendingMinor;
  return {
    incomeMinor,
    expenseMinor,
    spendingMinor,
    savedMinor,
    netMinor: incomeMinor - expenseMinor,
    totalSavingsMinor,
    savingsRate: percent(totalSavingsMinor, incomeMinor),
  };
}

// Per-category totals for one type, largest first, with share of the type total.
export function categoryBreakdown(rows, categoryMap, type) {
  const matching = rows.filter((row) => row.type === type);
  const typeTotal = matching.reduce((sum, row) => sum + row.totalMinor, 0);

  return matching
    .map((row) => {
      const category = categoryMap.get(row.categoryId);
      return {
        categoryId: row.categoryId,
        name: category?.name ?? 'Unknown',
        color: category?.color ?? '#64748b',
        icon: category?.icon ?? 'tag',
        isSavings: category?.isSavings ?? false,
        totalMinor: row.totalMinor,
        count: row.count,
        percentOfTotal: percent(row.totalMinor, typeTotal),
      };
    })
    .sort((a, b) => b.totalMinor - a.totalMinor || a.name.localeCompare(b.name));
}

// Totals for each month in `months`; months without transactions get zeros.
// `from`/`to` can narrow the first/last month for custom-range reports.
export async function monthlySeries(userId, months, categoryMap, { from, to } = {}) {
  const rows = await sumByMonthAndCategory(
    userId,
    from ?? monthRange(months[0]).from,
    to ?? monthRange(months.at(-1)).to,
  );

  const rowsByMonth = new Map();
  for (const row of rows) {
    if (!rowsByMonth.has(row.month)) rowsByMonth.set(row.month, []);
    rowsByMonth.get(row.month).push(row);
  }
  return months.map((month) => ({ month, ...computeTotals(rowsByMonth.get(month) ?? [], categoryMap) }));
}

// Opening balance + all income − all expenses dated on or before `date`.
export async function balanceAsOf(userId, date, openingBalanceMinor) {
  const rows = await Transaction.aggregate([
    matchStage(userId, null, date),
    { $group: { _id: '$type', totalMinor: { $sum: '$amountMinor' } } },
  ]);
  const total = (type) => rows.find((row) => row._id === type)?.totalMinor ?? 0;
  return openingBalanceMinor + total('income') - total('expense');
}
