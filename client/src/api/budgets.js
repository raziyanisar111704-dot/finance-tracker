import { api } from './client.js';

// Budgets for one month ("YYYY-MM") with what was actually spent, and totals.
export const fetchBudgets = (month, { signal } = {}) => api('/budgets', { query: { month }, signal });

// Creates the budget, or changes it if the category already has one that month.
export const saveBudget = ({ month, categoryId, limitMinor }) =>
  api('/budgets', { method: 'PUT', body: { month, categoryId, limitMinor } }).then((res) => res.budget);

export const deleteBudget = (id) => api(`/budgets/${id}`, { method: 'DELETE' });

// Copies one month's budgets to another. Existing budgets in `toMonth` are kept
// unless overwrite is true. Returns { copied, skipped }.
export const copyBudgets = ({ fromMonth, toMonth, overwrite = false }) =>
  api('/budgets/copy', { method: 'POST', body: { fromMonth, toMonth, overwrite } });
