import { Budget } from '../models/Budget.js';
import { budgetStatus } from '../services/budgets.service.js';
import { assertCategoryAccepts, findOwnCategory } from '../services/categories.service.js';
import { loadCategoryMap, sumByCategory } from '../services/summary.service.js';
import { AppError } from '../utils/AppError.js';
import { addMonths, monthRange, todayIn } from '../utils/dates.js';
import { percent } from '../utils/money.js';

// categoryId → expense total, from the same aggregation the dashboard uses.
function expenseByCategoryId(rows) {
  return new Map(rows.filter((row) => row.type === 'expense').map((row) => [row.categoryId, row.totalMinor]));
}

// GET /api/budgets?month=YYYY-MM — budgets with actual spending and last month's figures.
export async function listBudgets(req, res) {
  const month = req.valid.query.month ?? todayIn(req.user.timezone).slice(0, 7);
  const previousMonth = addMonths(month, -1);
  const range = monthRange(month);
  const previousRange = monthRange(previousMonth);

  const [categoryMap, budgets, previousBudgets, rows, previousRows] = await Promise.all([
    loadCategoryMap(req.userId),
    Budget.find({ userId: req.userId, month }).lean(),
    Budget.find({ userId: req.userId, month: previousMonth }).lean(),
    sumByCategory(req.userId, range.from, range.to),
    sumByCategory(req.userId, previousRange.from, previousRange.to),
  ]);

  const spent = expenseByCategoryId(rows);
  const previousSpent = expenseByCategoryId(previousRows);
  const previousLimit = new Map(previousBudgets.map((b) => [b.categoryId.toString(), b.limitMinor]));

  const items = budgets
    .map((budget) => {
      const categoryId = budget.categoryId.toString();
      const category = categoryMap.get(categoryId);
      const spentMinor = spent.get(categoryId) ?? 0;
      return {
        id: budget._id.toString(),
        categoryId,
        name: category?.name ?? 'Unknown',
        color: category?.color ?? '#64748b',
        icon: category?.icon ?? 'tag',
        limitMinor: budget.limitMinor,
        spentMinor,
        remainingMinor: budget.limitMinor - spentMinor,
        percentUsed: percent(spentMinor, budget.limitMinor),
        status: budgetStatus(spentMinor, budget.limitMinor),
        previous: {
          limitMinor: previousLimit.get(categoryId) ?? null,
          spentMinor: previousSpent.get(categoryId) ?? 0,
        },
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const limitMinor = items.reduce((sum, item) => sum + item.limitMinor, 0);
  const spentMinor = items.reduce((sum, item) => sum + item.spentMinor, 0);

  res.json({
    month,
    budgets: items,
    totals: {
      limitMinor,
      spentMinor,
      remainingMinor: limitMinor - spentMinor,
      percentUsed: percent(spentMinor, limitMinor),
    },
  });
}

// PUT /api/budgets — create or change the budget for one category and month.
export async function upsertBudget(req, res) {
  const { month, categoryId, limitMinor } = req.valid.body;
  const category = await findOwnCategory(req.userId, categoryId);
  assertCategoryAccepts(category, 'expense');

  const budget = await Budget.findOneAndUpdate(
    { userId: req.userId, month, categoryId: category._id },
    { $set: { limitMinor } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
  res.json({ budget });
}

export async function deleteBudget(req, res) {
  const { deletedCount } = await Budget.deleteOne({ _id: req.valid.params.id, userId: req.userId });
  if (deletedCount === 0) throw new AppError(404, 'Budget not found.');
  res.status(204).end();
}

// POST /api/budgets/copy — e.g. reuse October's budgets for November.
// Budgets for archived categories are skipped. Existing target budgets are
// kept unless `overwrite` is true.
export async function copyBudgets(req, res) {
  const { fromMonth, toMonth, overwrite } = req.valid.body;
  const [source, categoryMap] = await Promise.all([
    Budget.find({ userId: req.userId, month: fromMonth }).lean(),
    loadCategoryMap(req.userId),
  ]);

  const usable = source.filter((budget) => {
    const category = categoryMap.get(budget.categoryId.toString());
    return category && !category.archived;
  });

  let copied = 0;
  if (usable.length > 0) {
    const result = await Budget.bulkWrite(
      usable.map((budget) => ({
        updateOne: {
          filter: { userId: req.userId, month: toMonth, categoryId: budget.categoryId },
          update: { [overwrite ? '$set' : '$setOnInsert']: { limitMinor: budget.limitMinor } },
          upsert: true,
        },
      })),
    );
    copied = result.upsertedCount + (overwrite ? result.modifiedCount : 0);
  }

  res.json({ copied, skipped: source.length - copied });
}
