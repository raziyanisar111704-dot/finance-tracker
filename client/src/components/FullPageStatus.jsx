import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { Alert } from './ui/Alert.jsx';
import { Button } from './ui/Button.jsx';
import { Spinner } from './ui/Spinner.jsx';

// Shown while the app checks who is logged in, or if that check fails.
// The installed app can open with no connection. Then React Query pauses the
// check (paused = true) instead of failing it, and resumes by itself when the
// connection returns, so the message needs no button. If the device thinks
// it's online but the server can't be reached, the check fails (status 0).
export function FullPageStatus({ error, onRetry, paused = false }) {
  const online = useOnlineStatus();
  const offline = paused || (error && (!online || error.status === 0));
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      {offline ? (
        <Alert
          tone="info"
          title="You're offline"
          action={
            error && (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Try again
              </Button>
            )
          }
          className="w-full max-w-sm"
        >
          {online
            ? "Can't reach the server. Check your connection and try again."
            : 'Your data will load as soon as you reconnect.'}
        </Alert>
      ) : error ? (
        <Alert
          title="Couldn't load your account"
          action={
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          }
          className="w-full max-w-sm"
        >
          {error.message}
        </Alert>
      ) : (
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400" role="status">
          <Spinner />
          <span>Loading…</span>
        </div>
      )}
    </div>
  );
}
