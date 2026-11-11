import { api } from './client.js';

// rows: [{ date, type, amountMinor }] → indexes of rows already in the account.
export const checkDuplicates = (rows) =>
  api('/transactions/import/check', { method: 'POST', body: { rows } }).then((res) => res.duplicates);

// rows: [{ type, amountMinor, categoryId, date, paymentMethod, notes }] → { importId, count }
export const importTransactions = (rows) => api('/transactions/import', { method: 'POST', body: { rows } });

// → { deleted }
export const undoImport = (importId) => api(`/transactions/import/${importId}`, { method: 'DELETE' });
