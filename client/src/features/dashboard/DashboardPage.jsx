import { ChartColumn, ChartPie, Plus, Receipt } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardTitle } from '../../components/ui/Card.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { linkClasses } from '../auth/AuthLayout.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { formatDate, formatMonth, formatMonthName, todayIn } from '../../lib/dates.js';
import { formatMoney } from '../../lib/money.js';
import { useMe } from '../auth/useAuth.js';
import { useCategories } from '../categories/useCategories.js';
import { TransactionList } from '../transactions/TransactionList.jsx';
import { AddTransactionFab, useTransactionDialogs } from '../transactions/useTransactionDialogs.jsx';
import { BudgetAlerts } from './BudgetAlerts.jsx';
import { CategoryBars } from './CategoryBars.jsx';
import { MonthSwitcher } from './MonthSwitcher.jsx';
import { Delta, StatTile } from './StatTile.jsx';
import { TrendChart } from './TrendChart.jsx';
import { useMonthSummary, useTrend } from './useDashboard.js';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function NoComparison({ children }) {
  return <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>;
}

// Income / spending: percent change vs last month (server-computed, 1 decimal).
function percentDelta(percent, previousName, goodWhenUp) {
  if (percent === null) return <NoComparison>Nothing to compare with {previousName}</NoComparison>;
  return (
    <Delta
      direction={Math.sign(percent)}
      goodWhenUp={goodWhenUp}
      text={percent === 0 ? `Same as ${previousName}` : `${Math.abs(percent)}% vs ${previousName}`}
    />
  );
}

// Savings can be negative, where a percent change is meaningless
// (from −₹1,000 to +₹500 would read "−150%"), so show the amount instead.
function amountDelta(current, previous, previousName, previousHasData, currency) {
  if (!previousHasData) return <NoComparison>Nothing to compare with {previousName}</NoComparison>;
  const diff = current - previous;
  return (
    <Delta
      direction={Math.sign(diff)}
      goodWhenUp
      text={
        diff === 0
          ? `Same as ${previousName}`
          : `${formatMoney(Math.abs(diff), currency)} ${diff > 0 ? 'more' : 'less'} than ${previousName}`
      }
    />
  );
}

function LoadError({ what, query }) {
  return (
    <Alert
      title={`Couldn't load ${what}.`}
      action={
        <Button size="sm" variant="secondary" onClick={() => query.refetch()}>
          Try again
        </Button>
      }
    >
      {query.error.message}
    </Alert>
  );
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { data: user } = useMe();
  const { byId } = useCategories();
  const [params, setParams] = useSearchParams();
  const { openAdd, openEdit, dialogs } = useTransactionDialogs();

  // The month comes from the URL (?month=2026-10), so Back and bookmarks work.
  // Anything invalid, or in the future, falls back to the current month.
  const today = todayIn(user.timezone);
  const currentMonth = today.slice(0, 7);
  const requested = params.get('month') ?? '';
  const month = MONTH.test(requested) && requested <= currentMonth ? requested : currentMonth;
  const isCurrentMonth = month === currentMonth;
  const setMonth = (next) => setParams(next === currentMonth ? {} : { month: next });

  const summary = useMonthSummary(month);
  const trend = useTrend(month);
  const currency = user.currency;
  const firstName = user.name.split(' ')[0];

  const addButton = (
    <Button onClick={openAdd}>
      <Plus className="size-4" aria-hidden="true" />
      Add transaction
    </Button>
  );

  const header = (
    <>
      <PageHeader
        title={`Hi, ${firstName}`}
        description={`Here's ${isCurrentMonth ? 'this month' : formatMonth(month)} at a glance.`}
        actions={<div className="hidden lg:block">{addButton}</div>}
      />
      <div className="mb-6">
        <MonthSwitcher month={month} currentMonth={currentMonth} onChange={setMonth} />
      </div>
    </>
  );

  if (summary.isPending) {
    return (
      <>
        {header}
        <div className="flex justify-center py-16 text-slate-500">
          <Spinner className="size-6" label="Loading your dashboard" />
        </div>
      </>
    );
  }

  if (summary.isError && !summary.data) {
    return (
      <>
        {header}
        <LoadError what="your dashboard" query={summary} />
      </>
    );
  }

  const data = summary.data;
  const { totals } = data;
  const previous = data.previous.totals;
  const previousName = formatMonthName(data.previous.month);
  const previousHasData = previous.incomeMinor > 0 || previous.expenseMinor > 0;
  // Savings/Investments categories count as saved, not spent (ARCHITECTURE.md §6).
  const spendingRows = data.expenseByCategory.filter((row) => !row.isSavings);
  const trendHasData = trend.data?.some((m) => m.incomeMinor > 0 || m.spendingMinor > 0);

  return (
    <>
      {header}

      {summary.isError && (
        <Alert className="mb-4">Couldn't refresh: {summary.error.message} Showing the last loaded numbers.</Alert>
      )}

      {/* While another month loads, the current numbers stay, dimmed: no flash, no jump. */}
      <div className={`space-y-6 transition-opacity ${summary.isPlaceholderData ? 'opacity-60' : ''}`}>
        <section aria-label="Summary" className="space-y-4">
          {/* @container + cqi units: the headline shrinks with its card, so even
              ₹12,34,567.89 stays on one line on a small phone. */}
          <Card padded={false} className="@container p-5">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {isCurrentMonth ? 'Balance today' : `Balance at the end of ${formatMonthName(month)}`}
            </p>
            {/* The one headline number on the page. */}
            <p className="mt-1 whitespace-nowrap text-[clamp(1.75rem,11cqi,3rem)] font-semibold leading-tight tracking-tight">
              {formatMoney(data.balance.balanceMinor, currency)}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              All income minus all expenses up to {formatDate(data.balance.asOf)}.
            </p>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label="Income"
              swatch="var(--viz-income)"
              value={formatMoney(totals.incomeMinor, currency)}
              delta={percentDelta(data.change.incomePercent, previousName, true)}
            />
            <StatTile
              label="Spending"
              swatch="var(--viz-spending)"
              value={formatMoney(totals.spendingMinor, currency)}
              delta={percentDelta(data.change.spendingPercent, previousName, false)}
              note={
                totals.savedMinor > 0
                  ? `Not counting ${formatMoney(totals.savedMinor, currency)} put into savings & investments.`
                  : undefined
              }
            />
            <StatTile
              label="Saved"
              value={formatMoney(totals.totalSavingsMinor, currency, { signDisplay: 'exceptZero' })}
              delta={amountDelta(
                totals.totalSavingsMinor,
                previous.totalSavingsMinor,
                previousName,
                previousHasData,
                currency,
              )}
              note={
                totals.totalSavingsMinor < 0
                  ? 'You spent more than you earned this month.'
                  : totals.savingsRate !== null
                    ? `${totals.savingsRate}% of your income.`
                    : undefined
              }
            />
          </div>
        </section>

        <BudgetAlerts month={month} isCurrentMonth={isCurrentMonth} currency={currency} />

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardTitle description="Select a month to see its details.">Income and spending, last 6 months</CardTitle>
            {trend.isPending ? (
              <div className="flex h-56 items-center justify-center text-slate-500">
                <Spinner label="Loading chart" />
              </div>
            ) : trend.isError && !trend.data ? (
              <LoadError what="the chart" query={trend} />
            ) : trendHasData ? (
              <div className={trend.isPlaceholderData ? 'opacity-60' : ''}>
                <TrendChart months={trend.data} currency={currency} selectedMonth={month} onSelectMonth={setMonth} />
              </div>
            ) : (
              <EmptyState
                icon={ChartColumn}
                title="Nothing to chart yet"
                description="Add income and expenses, and you'll see how each month compares."
              />
            )}
          </Card>

          <Card className="lg:col-span-2">
            <CardTitle description={`${formatMonth(month)}. Select a category to see its transactions.`}>
              Spending by category
            </CardTitle>
            {spendingRows.length > 0 ? (
              <CategoryBars
                rows={spendingRows}
                totalMinor={totals.spendingMinor}
                currency={currency}
                from={data.from}
                to={data.to}
              />
            ) : (
              <EmptyState
                icon={ChartPie}
                title={`No spending in ${formatMonthName(month)}`}
                description="Expenses you add for this month will be broken down here."
              />
            )}
          </Card>
        </div>

        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-5">
            <h2 className="text-base font-semibold">
              {isCurrentMonth ? 'Recent transactions' : `Latest up to ${formatDate(data.to)}`}
            </h2>
            <Link to="/transactions" className={`text-sm ${linkClasses}`}>
              View all
            </Link>
          </div>
          {data.recentTransactions.length > 0 ? (
            <TransactionList
              layout="list"
              items={data.recentTransactions}
              byId={byId}
              currency={currency}
              today={today}
              onEdit={openEdit}
            />
          ) : (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Add your first income or expense to start seeing your numbers here."
              action={addButton}
            />
          )}
        </Card>
      </div>

      <AddTransactionFab onClick={openAdd} />
      {dialogs}
    </>
  );
}
