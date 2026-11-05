import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import * as categoriesApi from '../../api/categories.js';
import { invalidateFinanceData, queryClient } from '../../lib/queryClient.js';

export const CATEGORIES_KEY = ['categories'];

// All categories (archived included) plus a lookup by id.
export function useCategories() {
  const query = useQuery({ queryKey: CATEGORIES_KEY, queryFn: categoriesApi.fetchCategories, staleTime: 5 * 60_000 });
  const byId = useMemo(
    () => new Map((query.data ?? []).map((category) => [category.id, category])),
    [query.data],
  );
  return { ...query, categories: query.data ?? [], byId };
}

// Names, colours and "counts as savings" appear in every total and chart,
// so a category change refreshes those too.
function refreshAfterCategoryChange() {
  return Promise.all([queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }), invalidateFinanceData()]);
}

export const useCreateCategory = () =>
  useMutation({ mutationFn: categoriesApi.createCategory, onSuccess: refreshAfterCategoryChange });

export const useUpdateCategory = () =>
  useMutation({
    mutationFn: ({ id, changes }) => categoriesApi.updateCategory(id, changes),
    onSuccess: refreshAfterCategoryChange,
  });

export const useDeleteCategory = () =>
  useMutation({
    mutationFn: ({ id, moveTo }) => categoriesApi.deleteCategory(id, moveTo),
    onSuccess: refreshAfterCategoryChange,
  });
