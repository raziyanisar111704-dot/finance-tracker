import { Budget } from '../models/Budget.js';
import { Category } from '../models/Category.js';
import { Transaction } from '../models/Transaction.js';
import { loadCategoryMap } from '../services/summary.service.js';
import { toCsv } from '../utils/csv.js';
import { todayIn } from '../utils/dates.js';
import { minorToDecimalString } from '../utils/money.js';

export const CSV_HEADER = ['date', 'type', 'category', 'amount', 'currency', 'payment_method', 'notes', 'recurring'];

// GET /api/export/transactions.csv?from&to — opens in Excel / Google Sheets.
export async function exportTransactionsCsv(req, res) {
  const { from, to } = req.valid.query;
  const filter = { userId: req.userId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }

  const [transactions, categoryMap] = await Promise.all([
    Transaction.find(filter).sort({ date: 1, createdAt: 1, _id: 1 }).lean(),
    loadCategoryMap(req.userId),
  ]);

  const { currency } = req.user;
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    categoryMap.get(t.categoryId.toString())?.name ?? '',
    minorToDecimalString(t.amountMinor, currency),
    currency,
    t.paymentMethod,
    t.notes,
    t.isRecurring ? 'yes' : 'no',
  ]);

  res.attachment(`transactions-${todayIn(req.user.timezone)}.csv`);
  res.type('text/csv; charset=utf-8');
  res.send(toCsv([CSV_HEADER, ...rows]));
}

// GET /api/export/backup.json — everything needed to restore the account's data.
export async function exportBackup(req, res) {
  const [categories, transactions, budgets] = await Promise.all([
    Category.find({ userId: req.userId }).sort({ type: 1, name: 1 }),
    Transaction.find({ userId: req.userId }).sort({ date: 1, createdAt: 1 }),
    Budget.find({ userId: req.userId }).sort({ month: 1 }),
  ]);

  const { name, email, currency, timezone, openingBalanceMinor } = req.user;
  res.attachment(`finance-backup-${todayIn(timezone)}.json`);
  res.json({
    format: 'finance-tracker-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    user: { name, email, currency, timezone, openingBalanceMinor },
    categories,
    transactions,
    budgets,
  });
}
