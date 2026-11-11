import { onlineManager, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client.js';

export const ME_KEY = ['me'];

// React Query assumes it starts online and only learns otherwise from a later
// "offline" event. The installed app can start with no connection, so tell it
// the truth: then requests wait (paused) and run by themselves on reconnect,
// instead of failing.
onlineManager.setOnline(navigator.onLine);

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // A data request answered with 401 means the session expired: mark the
    // user as logged out, which sends them to the login page.
    onError: (error, query) => {
      if (error instanceof ApiError && error.status === 401 && query.queryKey[0] !== ME_KEY[0]) {
        queryClient.setQueryData(ME_KEY, null);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry network hiccups and server errors, but not "bad request" or
      // "not found": repeating those can't succeed.
      retry: (failureCount, error) =>
        error instanceof ApiError && error.status >= 400 && error.status < 500 ? false : failureCount < 2,
    },
    mutations: { retry: false },
  },
});

// After a transaction changes, every total, budget and report may be out of
// date. Refetch all of them (anything except the user and categories).
export function invalidateFinanceData() {
  return queryClient.invalidateQueries({
    predicate: (query) => ![ME_KEY[0], 'categories'].includes(query.queryKey[0]),
  });
}

// Removes every cached query except the current user, e.g. on log out, so
// the next person on a shared device never sees the previous person's data.
export function clearPrivateData() {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== ME_KEY[0] });
}
