import { Types } from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { assertCategoryAccepts, findOwnCategory } from '../services/categories.service.js';
import { AppError } from '../utils/AppError.js';

const NOT_FOUND = 'Transaction not found.';

// Treat the search text literally: "(" or "." must not act as regex syntax.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every filter starts with the user's id, so a user only ever sees their own rows.
function buildFilter(userId, query) {
  const filter = { userId };
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = query.from;
    if (query.to) filter.date.$lte = query.to;
  }
  if (query.type) filter.type = query.type;
  // aggregate() doesn't convert strings to ObjectIds, so do it here.
  if (query.categoryId) filter.categoryId = new Types.ObjectId(query.categoryId);
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
  if (query.q) filter.notes = { $regex: escapeRegex(query.q), $options: 'i' };
  return filter;
}

async function findOwnOr404(userId, id) {
  const transaction = await Transaction.findOne({ _id: id, userId });
  if (!transaction) throw new AppError(404, NOT_FOUND);
  return transaction;
}

export async function listTransactions(req, res) {
  const query = req.valid.query;
  const filter = buildFilter(req.userId, query);

  const [items, total, sums] = await Promise.all([
    Transaction.find(filter)
      .sort({ date: -1, createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Transaction.countDocuments(filter),
    Transaction.aggregate([
      { $match: filter },
      { $group: { _id: '$type', totalMinor: { $sum: '$amountMinor' } } },
    ]),
  ]);

  // Totals cover every matching transaction, not just this page.
  const totals = { incomeMinor: 0, expenseMinor: 0 };
  for (const { _id: type, totalMinor } of sums) totals[`${type}Minor`] = totalMinor;

  res.json({
    items,
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
    totals,
  });
}

export async function getTransaction(req, res) {
  const transaction = await findOwnOr404(req.userId, req.valid.params.id);
  res.json({ transaction });
}

export async function createTransaction(req, res) {
  const data = req.valid.body;
  const category = await findOwnCategory(req.userId, data.categoryId);
  assertCategoryAccepts(category, data.type);

  const transaction = await Transaction.create({ ...data, userId: req.userId });
  res.status(201).json({ transaction });
}

export async function updateTransaction(req, res) {
  const transaction = await findOwnOr404(req.userId, req.valid.params.id);
  const changes = req.valid.body;

  // Re-check the category whenever the type or category changes, so the
  // pair always stays consistent.
  if (changes.type || changes.categoryId) {
    const category = await findOwnCategory(req.userId, changes.categoryId ?? transaction.categoryId);
    assertCategoryAccepts(category, changes.type ?? transaction.type, {
      allowArchived: !changes.categoryId,
    });
  }

  Object.assign(transaction, changes);
  await transaction.save();
  res.json({ transaction });
}

export async function deleteTransaction(req, res) {
  const { deletedCount } = await Transaction.deleteOne({ _id: req.valid.params.id, userId: req.userId });
  if (deletedCount === 0) throw new AppError(404, NOT_FOUND);
  res.status(204).end();
}
