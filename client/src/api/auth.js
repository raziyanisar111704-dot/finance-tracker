import { api } from './client.js';

// Returns the logged-in user, or null when nobody is logged in.
export async function fetchMe({ signal } = {}) {
  try {
    const data = await api('/auth/me', { signal });
    return data.user;
  } catch (err) {
    if (err.status === 401) return null;
    throw err;
  }
}

export const login = (credentials) =>
  api('/auth/login', { method: 'POST', body: credentials }).then((data) => data.user);

export const register = (account) =>
  api('/auth/register', { method: 'POST', body: account }).then((data) => data.user);

export const logout = () => api('/auth/logout', { method: 'POST' });

export const logoutAllDevices = () => api('/auth/logout-all', { method: 'POST' });

// changes: any of { name, currency, timezone, openingBalanceMinor }
export const updateMe = (changes) =>
  api('/auth/me', { method: 'PATCH', body: changes }).then((data) => data.user);

// Deletes the account and every transaction, budget and category in it.
export const deleteAccount = (password) => api('/auth/me', { method: 'DELETE', body: { password } });

// Emails a reset link (if the account exists). Resolves to the server's
// message, which is the same whether or not it exists.
export const requestPasswordReset = (email) =>
  api('/auth/forgot-password', { method: 'POST', body: { email } }).then((data) => data.message);

// token: from the emailed link. Logs out every device.
export const resetPassword = ({ token, password }) =>
  api('/auth/reset-password', { method: 'POST', body: { token, password } }).then((data) => data.message);
