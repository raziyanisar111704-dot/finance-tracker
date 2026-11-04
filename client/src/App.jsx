import { useCallback, useEffect, useState } from 'react';

// Phase 2 "walking skeleton": proves the full chain works
// browser → React → /api/health → Express → MongoDB.
// Phase 4 replaces this page with the real app.

const BADGE_STYLES = {
  ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  error: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  loading: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

function StatusRow({ label, state, detail }) {
  const text = { ok: 'Connected', error: 'Not reachable', loading: 'Checking…' }[state];
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-medium">{label}</p>
        {detail && <p className="text-sm text-slate-500 dark:text-slate-400">{detail}</p>}
      </div>
      <span className={`rounded-full px-3 py-1 text-sm font-medium ${BADGE_STYLES[state]}`}>
        {text}
      </span>
    </div>
  );
}

export default function App() {
  const [health, setHealth] = useState({ loading: true });

  const checkHealth = useCallback(async () => {
    setHealth({ loading: true });
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(15000) });
      const data = await res.json().catch(() => null);
      setHealth({ loading: false, api: data !== null, db: data?.db === 'ok', data });
    } catch (err) {
      setHealth({
        loading: false,
        api: false,
        db: false,
        message: err.name === 'TimeoutError' ? 'The request timed out.' : 'Could not reach the server.',
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const stateOf = (ok) => (health.loading ? 'loading' : ok ? 'ok' : 'error');

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold">Finance Tracker</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">System status</p>

        <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800" aria-live="polite">
          <StatusRow label="API server" state={stateOf(health.api)} />
          <StatusRow
            label="Database"
            state={stateOf(health.db)}
            detail={health.data?.dbLatencyMs != null ? `${health.data.dbLatencyMs} ms` : undefined}
          />
        </div>

        {health.message && (
          <p className="mt-4 text-sm text-rose-700 dark:text-rose-300">{health.message}</p>
        )}

        <button
          type="button"
          onClick={checkHealth}
          disabled={health.loading}
          className="mt-6 w-full rounded-xl bg-teal-700 px-4 py-3 font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
        >
          {health.loading ? 'Checking…' : 'Check again'}
        </button>
      </div>
    </main>
  );
}
