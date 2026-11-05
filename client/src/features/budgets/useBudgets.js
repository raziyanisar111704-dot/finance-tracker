import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import * as budgetsApi from '../../api/budgets.js';
import { queryClient } from '../../lib/queryClient.js';

export const budgetsKey = (month) => ['budgets', month];

// Budgets for one month with actual spending. Transaction changes refresh
// these automatically (invalidateFinanceData covers every 'budgets' query).
export function useBudgets(month, { enabled = true } = {}) {
  return useQuery({
    queryKey: budgetsKey(month),
    queryFn: ({ signal }) => budgetsApi.fetchBudgets(month, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

const refreshBudgets = () => queryClient.invalidateQueries({ queryKey: ['budgets'] });

export const useSaveBudget = () => useMutation({ mutationFn: budgetsApi.saveBudget, onSuccess: refreshBudgets });
export const useDeleteBudget = () => useMutation({ mutationFn: budgetsApi.deleteBudget, onSuccess: refreshBudgets });
export const useCopyBudgets = () => useMutation({ mutationFn: budgetsApi.copyBudgets, onSuccess: refreshBudgets });
