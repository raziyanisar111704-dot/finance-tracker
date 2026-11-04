import { Budget } from '../models/Budget.js';
import { Category } from '../models/Category.js';
import { Transaction } from '../models/Transaction.js';
import { assertCategoryAccepts, findOwnCategory } from '../services/categories.service.js';
import { AppError } from '../utils/AppError.js';

const NOT_FOUND = 'Category not found.';

async function findOwnOr404(userId, id) {
  const category = await Category.findOne({ _id: id, userId });
  if (!category) throw new AppError(404, NOT_FOUND);
  return category;
}

// Saves and turns a unique-index violation into a helpful message.
async function saveCategory(category) {
  try {
    await category.save();
  } catch (err) {
    if (err.code !== 11000) throw err;
    throw new AppError(409, `You already have an ${category.type} category named "${category.name}".`);
  }
}

export async function listCategories(req, res) {
  const { type, includeArchived } = req.valid.query;
  const filter = { userId: req.userId };
  if (type) filter.type = type;
  if (!includeArchived) filter.archived = false;

  const categories = await Category.find(filter)
    .collation({ locale: 'en', strength: 2 })
    .sort({ type: 1, name: 1 });
  res.json({ categories });
}

export async function createCategory(req, res) {
  const category = new Category({ ...req.valid.body, userId: req.userId });
  await saveCategory(category);
  res.status(201).json({ category });
}

export async function updateCategory(req, res) {
  const category = await findOwnOr404(req.userId, req.valid.params.id);
  const changes = req.valid.body;

  if (changes.isSavings && category.type === 'income') {
    throw new AppError(400, 'Only expense categories can be marked as savings.');
  }

  Object.assign(category, changes);
  await saveCategory(category);
  res.json({ category });
}

// A category that is still used can't simply disappear: its transactions
// would lose their category. The user either archives it, or passes
// ?moveTo=<otherCategoryId> to move the transactions first.
export async function deleteCategory(req, res) {
  const category = await findOwnOr404(req.userId, req.valid.params.id);
  const { moveTo } = req.valid.query;
  const owned = { userId: req.userId, categoryId: category._id };

  if (moveTo) {
    if (moveTo === category.id) {
      throw new AppError(400, 'Choose a different category to move the transactions to.');
    }
    const target = await findOwnCategory(req.userId, moveTo, 'moveTo');
    assertCategoryAccepts(target, category.type, { field: 'moveTo' });
    await Transaction.updateMany(owned, { $set: { categoryId: target._id } });
  } else {
    const inUse = await Transaction.countDocuments(owned);
    if (inUse > 0) {
      throw new AppError(
        409,
        `"${category.name}" is used by ${inUse} transaction${inUse === 1 ? '' : 's'}. ` +
          'Archive it instead, or move its transactions to another category.',
      );
    }
  }

  await Budget.deleteMany(owned);
  await category.deleteOne();
  res.status(204).end();
}
