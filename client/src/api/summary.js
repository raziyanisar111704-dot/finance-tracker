import { api } from './client.js';

// Totals, last-month comparison, category breakdown, balance and recent
// transactions for one month ("YYYY-MM").
export const fetchMonthSummary = (month, { signal } = {}) => api('/summary/month', { query: { month }, signal });

// Month-by-month totals, ending with `end` ("YYYY-MM").
export const fetchTrend = ({ months, end }, { signal } = {}) =>
  api('/summary/trend', { query: { months, end }, signal }).then((res) => res.months);
