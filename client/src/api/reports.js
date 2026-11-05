import { api } from './client.js';

// Totals, per-month series and breakdowns for any range of dates ("YYYY-MM-DD").
export const fetchReport = ({ from, to }, { signal } = {}) => api('/reports', { query: { from, to }, signal });
