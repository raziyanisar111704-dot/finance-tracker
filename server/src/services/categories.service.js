import { Category } from '../models/Category.js';
import { AppError } from '../utils/AppError.js';

const fieldError = (field, message) =>
  new AppError(400, 'Please check the highlighted fields.', [{ field, message }]);

// Loads a category only if it belongs to this user. Used whenever a request
// refers to a category by id, so nobody can attach data to someone else's.
export async function findOwnCategory(userId, categoryId, field = 'categoryId') {
  const category = await Category.findOne({ _id: categoryId, userId });
  if (!category) throw fieldError(field, 'Category not found.');
  return category;
}

// A transaction's type must match its category's type; otherwise income could
// be counted as spending. Archived categories can't receive new transactions
// (`allowArchived` lets an existing transaction keep its archived category).
export function assertCategoryAccepts(
  category,
  type,
  { field = 'categoryId', allowArchived = false } = {},
) {
  if (category.type !== type) {
    throw fieldError(field, `"${category.name}" is an ${category.type} category; choose an ${type} category.`);
  }
  if (category.archived && !allowArchived) {
    throw fieldError(field, `"${category.name}" is archived. Choose another category or unarchive it.`);
  }
}
