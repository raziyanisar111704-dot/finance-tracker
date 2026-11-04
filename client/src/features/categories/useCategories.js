import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchCategories } from '../../api/categories.js';

export const CATEGORIES_KEY = ['categories'];

// All categories (archived included) plus a lookup by id.
export function useCategories() {
  const query = useQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchCategories, staleTime: 5 * 60_000 });
  const byId = useMemo(
    () => new Map((query.data ?? []).map((category) => [category.id, category])),
    [query.data],
  );
  return { ...query, categories: query.data ?? [], byId };
}
