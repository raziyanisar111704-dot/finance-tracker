import { Types } from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import {
  balanceAsOf,
  categoryBreakdown,
  computeTotals,
  loadCategoryMap,
  monthlySeries,
  sumByCategory,
} from '../services/summary.service.js';
import { addMonths, monthRange, monthsBetween, todayIn } from '../utils/dates.js';
import { percentChange } from '../utils/money.js';

// GET /api/summary/month?month=YYYY-MM — everything the dashboard shows.
// Without `month`, uses the current month in the user's time zone.
export async function monthSummary(req, res) {
  const { timezone, openingBalanceMinor } = req.user;
  const today = todayIn(timezone);
  const month = req.valid.query.month ?? today.slice(0, 7);
  const previousMonth = addMonths(month, -1);
  const range = monthRange(month);
  const previousRange = monthRange(previousMonth);

  // For the current month the balance is "as of today"; otherwise as of month end.
  const balanceDate = today >= range.from && today <= range.to ? today : range.to;

  const [categoryMap, rows, previousRows, balanceMinor, recentTransactions] = await Promise.all([
    loadCategoryMap(req.userId),
    sumByCategory(req.userId, range.from, range.to),
    sumByCategory(req.userId, previousRange.from, previousRange.to),
    balanceAsOf(req.userId, balanceDate, openingBalanceMinor),
    Transaction.find({ userId: req.userId, date: { $lte: range.to } })
      .sort({ date: -1, createdAt: -1, _id: -1 })
      .limit(5),
  ]);

  const totals = computeTotals(rows, categoryMap);
  const previousTotals = computeTotals(previousRows, categoryMap);

  res.json({
    month,
    from: range.from,
    to: range.to,
    today,
    totals,
    previous: { month: previousMonth, totals: previousTotals },
    change: {
      incomePercent: percentChange(totals.incomeMinor, previousTotals.incomeMinor),
      spendingPercent: percentChange(totals.spendingMinor, previousTotals.spendingMinor),
      totalSavingsPercent: percentChange(totals.totalSavingsMinor, previousTotals.totalSavingsMinor),
    },
    expenseByCategory: categoryBreakdown(rows, categoryMap, 'expense'),
    incomeByCategory: categoryBreakdown(rows, categoryMap, 'income'),
    balance: { asOf: balanceDate, balanceMinor },
    recentTransactions,
  });
}

// GET /api/summary/trend?months=6&end=YYYY-MM — month-by-month chart data.
export async function trend(req, res) {
  const { months: count, end } = req.valid.query;
  const lastMonth = end ?? todayIn(req.user.timezone).slice(0, 7);
  const months = Array.from({ length: count }, (_, i) => addMonths(lastMonth, i - count + 1));

  const categoryMap = await loadCategoryMap(req.userId);
  res.json({ months: await monthlySeries(req.userId, months, categoryMap) });
}

// GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD — custom range or yearly report.
export async function rangeReport(req, res) {
  const { from, to } = req.valid.query;
  const months = monthsBetween(from.slice(0, 7), to.slice(0, 7));

  const [categoryMap, rows, paymentRows] = await Promise.all([
    loadCategoryMap(req.userId),
    sumByCategory(req.userId, from, to),
    Transaction.aggregate([
      { $match: { userId: new Types.ObjectId(req.userId), type: 'expense', date: { $gte: from, $lte: to } } },
      { $group: { _id: '$paymentMethod', totalMinor: { $sum: '$amountMinor' }, count: { $sum: 1 } } },
      { $sort: { totalMinor: -1, _id: 1 } },
    ]),
  ]);

  res.json({
    from,
    to,
    totals: computeTotals(rows, categoryMap),
    expenseByCategory: categoryBreakdown(rows, categoryMap, 'expense'),
    incomeByCategory: categoryBreakdown(rows, categoryMap, 'income'),
    byMonth: await monthlySeries(req.userId, months, categoryMap, { from, to }),
    expenseByPaymentMethod: paymentRows.map(({ _id, totalMinor, count }) => ({
      paymentMethod: _id,
      totalMinor,
      count,
    })),
  });
}
