import { api } from './client.js';

// Includes archived categories, so old transactions can still show their
// category name. Forms filter archived ones out.
export const fetchCategories = ({ signal } = {}) =>
  api('/categories', { query: { includeArchived: 'true' }, signal }).then((res) => res.categories);
