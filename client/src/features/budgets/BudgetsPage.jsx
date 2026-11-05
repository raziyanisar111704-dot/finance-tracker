import { Copy, Plus, Target } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { addMonths, formatMonth, formatMonthName, todayIn } from '../../lib/dates.js';
import { formatMoney } from '../../lib/money.js';
import { useMe } from '../auth/useAuth.js';
import { CategoryIcon } from '../categories/CategoryIcon.jsx';
import { MonthSwitcher } from '../dashboard/MonthSwitcher.jsx';
import { BudgetFormDialog } from './BudgetFormDialog.jsx';
import { BudgetMeter } from './BudgetMeter.jsx';
import { useBudgets, useCopyBudgets, useDeleteBudget } from './useBudgets.js';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

// Same rule as the server (server/src/services/budgets.service.js).
function statusOf(spentMinor, limitMinor) {
  if (spentMinor > limitMinor) return 'exceeded';
  if (spentMinor * 5 >= limitMinor * 4) return 'warning';
  return 'ok';
}

function BudgetRow({ budget, currency, onEdit }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onEdit(budget)}
        aria-label={`${budget.name}: ${formatMoney(budget.spentMinor, currency)} of ${formatMoney(budget.limitMinor, currency)}. Edit budget.`}
        className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-600 dark:hover:bg-slate-800/50"
      >
        <CategoryIcon category={budget} />
        <div className="min-w-0 flex-1" aria-hidden="true">
          {/* Wraps instead of truncating: on a phone, a long name pushes the
              amount onto its own line. */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="min-w-0 break-words font-medium">{budget.name}</p>
            <p className="tabular text-sm">
              <span className="font-semibold">{formatMoney(budget.spentMinor, currency)}</span>
              <span className="text-slate-500 dark:text-slate-400"> of {formatMoney(budget.limitMinor, currency)}</span>
            </p>
          </div>
          <BudgetMeter budget={budget} currency={currency} className="mt-2" />
        </div>
      </button>
    </li>
  );
}

export default function BudgetsPage() {
  useDocumentTitle('Budgets');
  const { data: user } = useMe();
  const currency = user.currency;
  const [params, setParams] = useSearchParams();

  // Budgets can be set up to one month ahead, to plan the next month.
  const currentMonth = todayIn(user.timezone).slice(0, 7);
  const maxMonth = addMonths(currentMonth, 1);
  const requested = params.get('month') ?? '';
  const month = MONTH.test(requested) && requested <= maxMonth ? requested : currentMonth;
  const previousMonth = addMonths(month, -1);
  const setMonth = (next) => setParams(next === currentMonth ? {} : { month: next });

  const budgets = useBudgets(month);
  const previous = useBudgets(previousMonth);
  const copy = useCopyBudgets();
  const remove = useDeleteBudget();

  // editing: undefined = closed, null = adding, object = editing.
  const [editing, setEditing] = useState(undefined);
  const [removing, setRemoving] = useState(null);
  const [copyResult, setCopyResult] = useState(null);

  // While another month loads, the last one stays on screen, dimmed.
  const items = budgets.data?.budgets ?? [];
  const previousCount = previous.data?.budgets.length ?? 0;
  const usedCategoryIds = new Set(items.map((b) => b.categoryId));
  const missingFromPrevious = previous.data?.budgets.filter((b) => !usedCategoryIds.has(b.categoryId)).length ?? 0;

  function copyFromPrevious() {
    setCopyResult(null);
    copy.mutate(
      { fromMonth: previousMonth, toMonth: month },
      { onSuccess: (result) => setCopyResult({ ...result, month }) },
    );
  }

  function openRemove(budget) {
    setEditing(undefined);
    remove.reset();
    setRemoving(budget);
  }

  const copyButton = (
    <Button variant="secondary" onClick={copyFromPrevious} loading={copy.isPending}>
      <Copy className="size-4" aria-hidden="true" />
      Copy {formatMonthName(previousMonth)}'s budgets
    </Button>
  );

  const totals = budgets.data?.totals;
  const totalStatus = totals && totals.limitMinor > 0 ? statusOf(totals.spentMinor, totals.limitMinor) : 'ok';
  const overCount = items.filter((b) => b.status === 'exceeded').length;
  const nearCount = items.filter((b) => b.status === 'warning').length;

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Set a monthly limit for the categories you want to keep an eye on."
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus className="size-4" aria-hidden="true" />
            Add budget
          </Button>
        }
      />
      <div className="mb-6">
        <MonthSwitcher month={month} currentMonth={currentMonth} maxMonth={maxMonth} onChange={setMonth} />
      </div>

      {copy.error && <Alert className="mb-4">{copy.error.message}</Alert>}
      {copyResult?.month === month && (
        <Alert tone="success" className="mb-4">
          {copyResult.copied === 0
            ? 'Nothing new to copy: those categories already have budgets.'
            : `Copied ${copyResult.copied} budget${copyResult.copied === 1 ? '' : 's'} from ${formatMonthName(previousMonth)}.`}
        </Alert>
      )}

      {budgets.isPending ? (
        <div className="flex justify-center py-16 text-slate-500">
          <Spinner className="size-6" label="Loading budgets" />
        </div>
      ) : budgets.isError && !budgets.data ? (
        <Alert
          title="Couldn't load your budgets."
          action={
            <Button size="sm" variant="secondary" onClick={() => budgets.refetch()}>
              Try again
            </Button>
          }
        >
          {budgets.error.message}
        </Alert>
      ) : items.length === 0 ? (
        <Card className={budgets.isPlaceholderData ? 'opacity-60' : ''}>
          <EmptyState
            icon={Target}
            title={`No budgets for ${formatMonth(month)}`}
            description={
              previousCount > 0
                ? `Start with the ${previousCount} budget${previousCount === 1 ? '' : 's'} you had in ${formatMonthName(previousMonth)}, or add new ones.`
                : 'Add a limit for a category, like ₹8,000 for Groceries, and see how much is left as you spend.'
            }
            action={previousCount > 0 ? copyButton : undefined}
          />
        </Card>
      ) : (
        <div className={`space-y-6 transition-opacity ${budgets.isPlaceholderData ? 'opacity-60' : ''}`}>
          <Card>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total budgeted</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {formatMoney(totals.spentMinor, currency)}{' '}
              <span className="text-base font-normal text-slate-500 dark:text-slate-400">
                of {formatMoney(totals.limitMinor, currency)}
              </span>
            </p>
            <BudgetMeter budget={{ ...totals, status: totalStatus }} currency={currency} className="mt-3" />
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {overCount + nearCount === 0
                ? 'Every budget is on track.'
                : `${[
                    overCount > 0 && `${overCount} over budget`,
                    nearCount > 0 && `${nearCount} close to the limit`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}.`}{' '}
              Only categories with a budget are counted.
            </p>
          </Card>

          <Card padded={false} className="overflow-hidden">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((budget) => (
                <BudgetRow key={budget.id} budget={budget} currency={currency} onEdit={setEditing} />
              ))}
            </ul>
          </Card>

          {missingFromPrevious > 0 && <div>{copyButton}</div>}
        </div>
      )}

      <BudgetFormDialog
        open={editing !== undefined}
        budget={editing ?? null}
        month={month}
        usedCategoryIds={usedCategoryIds}
        onClose={() => setEditing(undefined)}
        onDelete={openRemove}
      />
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
        title="Remove budget?"
        confirmLabel="Remove"
        pending={remove.isPending}
        error={remove.error}
      >
        {removing && (
          <p>
            This removes the {formatMoney(removing.limitMinor, currency)} limit for {removing.name} in {formatMonth(month)}.
            Your transactions aren't affected.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
