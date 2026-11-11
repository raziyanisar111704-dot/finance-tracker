import { randomUUID } from 'node:crypto';
import { Category } from '../models/Category.js';
import { Transaction } from '../models/Transaction.js';
import { AppError } from '../utils/AppError.js';

const rowKey = (row) => `${row.date}|${row.type}|${row.amountMinor}`;

// POST /api/transactions/import/check  { rows: [{ date, type, amountMinor }] }
// → { duplicates: [rowIndex, …] }: rows that match a transaction already in
// the account (same date, type and amount). The preview unticks them, so
// importing the same bank statement twice doesn't double the spending.
export async function checkDuplicates(req, res) {
  const { rows } = req.valid.body;
  const dates = [...new Set(rows.map((row) => row.date))];
  const existing = await Transaction.find(
    { userId: req.userId, date: { $in: dates } },
    { date: 1, type: 1, amountMinor: 1 },
  ).lean();

  const known = new Set(existing.map(rowKey));
  const duplicates = rows.flatMap((row, index) => (known.has(rowKey(row)) ? [index] : []));
  res.json({ duplicates });
}

// POST /api/transactions/import  { rows: [{ type, amountMinor, categoryId, date, paymentMethod?, notes? }] }
// All or nothing: every row is checked first, and if any row is wrong nothing
// is saved and the answer lists each problem as "rows.<index>.<field>".
export async function importTransactions(req, res) {
  const { rows } = req.valid.body;
  const categories = await Category.find({ userId: req.userId }).lean();
  const byId = new Map(categories.map((c) => [c._id.toString(), c]));

  const details = [];
  rows.forEach((row, index) => {
    const category = byId.get(row.categoryId);
    const field = `rows.${index}.categoryId`;
    if (!category) details.push({ field, message: 'Category not found.' });
    else if (category.type !== row.type) {
      details.push({ field, message: `"${category.name}" is an ${category.type} category; choose an ${row.type} category.` });
    } else if (category.archived) {
      details.push({ field, message: `"${category.name}" is archived. Choose another category or unarchive it.` });
    }
  });
  if (details.length > 0) throw new AppError(400, 'Some rows need fixing. Nothing was imported.', details);

  const importId = randomUUID();
  const documents = rows.map((row) => ({ ...row, userId: req.userId, importId }));
  try {
    await Transaction.insertMany(documents, { ordered: true });
  } catch (err) {
    // A database failure halfway through: remove what got in, so the import
    // is either complete or absent, never half done.
    await Transaction.deleteMany({ userId: req.userId, importId }).catch(() => {});
    throw err;
  }
  res.status(201).json({ importId, count: documents.length });
}

// DELETE /api/transactions/import/:importId → { deleted }. Removes only the
// rows that import added (and only this user's).
export async function undoImport(req, res) {
  const { deletedCount } = await Transaction.deleteMany({
    userId: req.userId,
    importId: req.valid.params.importId,
  });
  if (deletedCount === 0) throw new AppError(404, 'That import was not found or has already been undone.');
  res.json({ deleted: deletedCount });
}
