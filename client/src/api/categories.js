import { api } from './client.js';

// Includes archived categories, so old transactions can still show their
// category name. Forms filter archived ones out.
export const fetchCategories = ({ signal } = {}) =>
  api('/categories', { query: { includeArchived: 'true' }, signal }).then((res) => res.categories);

export const createCategory = (data) =>
  api('/categories', { method: 'POST', body: data }).then((res) => res.category);

// The type (expense / income) can't be changed after creation.
export const updateCategory = (id, changes) =>
  api(`/categories/${id}`, { method: 'PATCH', body: changes }).then((res) => res.category);

// moveTo: another category of the same type that receives this one's
// transactions. Without it, the server refuses to delete a category in use.
export const deleteCategory = (id, moveTo) =>
  api(`/categories/${id}`, { method: 'DELETE', query: { moveTo } });
