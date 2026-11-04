import { api } from './client.js';

// filters: { from, to, type, categoryId, paymentMethod, q, page, limit }
export const fetchTransactions = (filters, { signal } = {}) =>
  api('/transactions', { query: filters, signal });

export const createTransaction = (data) =>
  api('/transactions', { method: 'POST', body: data }).then((res) => res.transaction);

// Send only the fields that changed.
export const updateTransaction = (id, changes) =>
  api(`/transactions/${id}`, { method: 'PATCH', body: changes }).then((res) => res.transaction);

export const deleteTransaction = (id) => api(`/transactions/${id}`, { method: 'DELETE' });
