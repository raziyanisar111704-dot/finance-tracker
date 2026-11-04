import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import * as transactionsApi from '../../api/transactions.js';
import { invalidateFinanceData } from '../../lib/queryClient.js';

// One page of transactions plus totals for everything matching the filters.
// keepPreviousData: the old page stays visible while the next one loads,
// instead of flashing a spinner on every filter change.
export function useTransactions(filters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: ({ signal }) => transactionsApi.fetchTransactions(filters, { signal }),
    placeholderData: keepPreviousData,
  });
}

export const useCreateTransaction = () =>
  useMutation({ mutationFn: transactionsApi.createTransaction, onSuccess: invalidateFinanceData });

export const useUpdateTransaction = () =>
  useMutation({
    mutationFn: ({ id, changes }) => transactionsApi.updateTransaction(id, changes),
    onSuccess: invalidateFinanceData,
  });

export const useDeleteTransaction = () =>
  useMutation({ mutationFn: transactionsApi.deleteTransaction, onSuccess: invalidateFinanceData });
