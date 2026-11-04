import { Alert } from './ui/Alert.jsx';
import { Button } from './ui/Button.jsx';
import { Spinner } from './ui/Spinner.jsx';

// Shown while the app checks who is logged in, or if that check fails.
export function FullPageStatus({ error, onRetry }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      {error ? (
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
