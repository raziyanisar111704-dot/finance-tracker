import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client.js';

export const ME_KEY = ['me'];

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

// Removes every cached query except the current user, e.g. on log out, so
// the next person on a shared device never sees the previous person's data.
export function clearPrivateData() {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== ME_KEY[0] });
}
