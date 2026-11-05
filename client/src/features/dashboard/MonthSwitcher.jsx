import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { addMonths, formatMonth } from '../../lib/dates.js';

const arrowClasses =
  'inline-flex size-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800';

// ◀ November 2026 ▶ — the one filter on the dashboard; everything below follows it.
export function MonthSwitcher({ month, currentMonth, onChange }) {
  const isCurrent = month === currentMonth;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => onChange(addMonths(month, -1))}
          aria-label={`Previous month, ${formatMonth(addMonths(month, -1))}`}
          className={arrowClasses}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <p className="min-w-36 text-center text-sm font-semibold" aria-live="polite">
          {formatMonth(month)}
        </p>
        <button
          type="button"
          onClick={() => onChange(addMonths(month, 1))}
          disabled={month >= currentMonth}
          aria-label={`Next month, ${formatMonth(addMonths(month, 1))}`}
          className={arrowClasses}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
      {!isCurrent && (
        <Button variant="ghost" size="sm" onClick={() => onChange(currentMonth)}>
          Back to this month
        </Button>
      )}
    </div>
  );
}
