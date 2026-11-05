import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchMonthSummary, fetchTrend } from '../../api/summary.js';

// Both keys start with "summary", so invalidateFinanceData() refreshes them
// after any transaction changes. keepPreviousData: switching months keeps the
// old numbers on screen (dimmed) instead of flashing a spinner.
export function useMonthSummary(month) {
  return useQuery({
    queryKey: ['summary', 'month', month],
    queryFn: ({ signal }) => fetchMonthSummary(month, { signal }),
    placeholderData: keepPreviousData,
  });
}

export const TREND_MONTHS = 6;

export function useTrend(endMonth) {
  return useQuery({
    queryKey: ['summary', 'trend', TREND_MONTHS, endMonth],
    queryFn: ({ signal }) => fetchTrend({ months: TREND_MONTHS, end: endMonth }, { signal }),
    placeholderData: keepPreviousData,
  });
}
