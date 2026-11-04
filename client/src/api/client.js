// The one place that talks to the backend. Every API call goes through api(),
// so errors, timeouts and JSON handling behave the same everywhere.

const TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  constructor(status, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 = network problem (offline, timeout)
    this.details = details; // [{ field, message }] for form validation errors
  }
}

export async function api(path, { method = 'GET', body, query, signal } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (err) {
    // Cancelled by React Query (e.g. the user left the page): not an error to show.
    if (signal?.aborted) throw err;
    if (timeout.aborted) {
      throw new ApiError(0, 'The server is taking too long to respond. Check your connection and try again.');
    }
    throw new ApiError(0, "Can't reach the server. Check your internet connection and try again.");
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.message ?? `Something went wrong (error ${res.status}). Please try again.`,
      data?.error?.details ?? [],
    );
  }
  return data;
}
