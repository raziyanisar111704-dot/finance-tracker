import { CircleAlert, TriangleAlert } from 'lucide-react';
import { formatMoney } from '../../lib/money.js';

// Status colours (amber = close to the limit, rose = over it) always come
// with an icon and words, never colour alone.
const STATUS = {
  ok: { bar: 'bg-teal-600 dark:bg-teal-500', text: 'text-slate-500 dark:text-slate-400', icon: null },
  warning: { bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', icon: TriangleAlert },
  exceeded: { bar: 'bg-rose-600 dark:bg-rose-500', text: 'text-rose-700 dark:text-rose-400', icon: CircleAlert },
};

// Whole percent, rounded down, so it agrees with the server's status:
// "80% used" appears exactly when the warning starts (79.96% shows 79%).
export const usedPercent = (spentMinor, limitMinor) => Math.floor((spentMinor * 100) / limitMinor);

export function budgetMessage({ status, spentMinor, limitMinor, remainingMinor }, currency) {
  if (status === 'exceeded') return `${formatMoney(-remainingMinor, currency)} over budget`;
  const used = `${usedPercent(spentMinor, limitMinor)}% used`;
  if (remainingMinor === 0) return `${used}, nothing left`;
  return `${used}, ${formatMoney(remainingMinor, currency)} left`;
}

// budget: { status, spentMinor, limitMinor, remainingMinor }
export function BudgetMeter({ budget, currency, className = '' }) {
  const { bar, text, icon: Icon } = STATUS[budget.status];
  const width = Math.min(100, (budget.spentMinor / budget.limitMinor) * 100);
  return (
    <div className={className}>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${width}%`, minWidth: budget.spentMinor > 0 ? 4 : 0 }} />
      </div>
      <p className={`mt-1.5 flex items-center gap-1 text-sm ${text} ${Icon ? 'font-medium' : ''}`}>
        {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
        {budgetMessage(budget, currency)}
      </p>
    </div>
  );
}
