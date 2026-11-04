import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../api/auth.js';
import { clearPrivateData, ME_KEY } from '../../lib/queryClient.js';

// The logged-in user (or null). Cached, so every component can call it freely.
export function useMe() {
  return useQuery({ queryKey: ME_KEY, queryFn: authApi.fetchMe, staleTime: 5 * 60_000 });
}

// Login and register both start a fresh session: drop anything cached from a
// previous user, then store the new user. Route guards react automatically.
function useStartSession(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (user) => {
      clearPrivateData();
      queryClient.setQueryData(ME_KEY, user);
    },
  });
}

export const useLogin = () => useStartSession(authApi.login);
export const useRegister = () => useStartSession(authApi.register);

function useEndSession(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    // Even if the request fails (e.g. offline), forget the data locally.
    onSettled: () => {
      clearPrivateData();
      queryClient.setQueryData(ME_KEY, null);
    },
  });
}

export const useLogout = () => useEndSession(authApi.logout);
export const useLogoutAllDevices = () => useEndSession(authApi.logoutAllDevices);
