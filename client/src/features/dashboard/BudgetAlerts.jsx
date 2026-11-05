import { Link } from 'react-router';
import { Card } from '../../components/ui/Card.jsx';
import { linkClasses } from '../auth/AuthLayout.jsx';
import { BudgetMeter } from '../budgets/BudgetMeter.jsx';
import { useBudgets } from '../budgets/useBudgets.js';
import { CategoryIcon } from '../categories/CategoryIcon.jsx';

// Budgets at 80% or more for the month on screen, worst first. Shows nothing
// when every budget is on track, so it only takes space when it matters.
export function BudgetAlerts({ month, isCurrentMonth, currency }) {
  const { data } = useBudgets(month);
  if (!data || data.month !== month) return null;

  const alerts = data.budgets
    .filter((b) => b.status !== 'ok')
    .sort((a, b) => b.spentMinor / b.limitMinor - a.spentMinor / a.limitMinor);
  if (alerts.length === 0) return null;

  return (
    <Card aria-labelledby="budget-alerts-heading">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="budget-alerts-heading" className="text-base font-semibold">
          Budget alerts
        </h2>
        <Link to={isCurrentMonth ? '/budgets' : `/budgets?month=${month}`} className={`text-sm ${linkClasses}`}>
          See budgets
        </Link>
      </div>
      <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {alerts.map((budget) => (
          <li key={budget.id} className="flex items-start gap-3">
            <CategoryIcon category={budget} className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{budget.name}</p>
              <BudgetMeter budget={budget} currency={currency} className="mt-1.5" />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
