import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChartColumn, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { fetchReport } from '../../api/reports.js';
import { downloadTransactionsCsv } from '../../api/export.js';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardTitle } from '../../components/ui/Card.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { TextField } from '../../components/ui/TextField.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { PAYMENT_METHOD_LABELS } from '../../lib/constants.js';
import { formatDate, formatMonth, monthBounds, todayIn } from '../../lib/dates.js';
import { formatMoney, sharePercent } from '../../lib/money.js';
import { useMe } from '../auth/useAuth.js';
import { CategoryBars } from '../dashboard/CategoryBars.jsx';
import { MonthSwitcher } from '../dashboard/MonthSwitcher.jsx';
import { StatTile } from '../dashboard/StatTile.jsx';
import { TrendChart } from '../dashboard/TrendChart.jsx';

const VIEW_OPTIONS = [
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' },
];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR = /^\d{4}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const arrowClasses =
  'inline-flex size-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800';

// The period lives in the URL (?view=year&year=2025), so reports can be
// bookmarked and Back works. Anything invalid falls back to a sensible default.
function readPeriod(params, today) {
  const currentMonth = today.slice(0, 7);
  const currentYear = today.slice(0, 4);
  const view = ['year', 'custom'].includes(params.get('view')) ? params.get('view') : 'month';

  if (view === 'year') {
    const requested = params.get('year') ?? '';
    const year = YEAR.test(requested) && requested >= '1970' && requested <= currentYear ? requested : currentYear;
    return { view, year, from: `${year}-01-01`, to: `${year}-12-31` };
  }
  if (view === 'custom') {
    const valid = (value) => (DATE.test(value ?? '') ? value : null);
    return {
      view,
      from: valid(params.get('from')) ?? monthBounds(today, -2).from,
      to: valid(params.get('to')) ?? today,
    };
  }
  const requested = params.get('month') ?? '';
  const month = MONTH.test(requested) && requested <= currentMonth ? requested : currentMonth;
  return { view, month, ...monthBounds(`${month}-01`) };
}

function YearSwitcher({ year, currentYear, onChange }) {
  const previous = String(Number(year) - 1);
  const next = String(Number(year) + 1);
  return (
    <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900">
      <button type="button" onClick={() => onChange(previous)} aria-label={`Previous year, ${previous}`} className={arrowClasses}>
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <p className="min-w-24 text-center text-sm font-semibold" aria-live="polite">
        {year}
      </p>
      <button
        type="button"
        onClick={() => onChange(next)}
        disabled={year >= currentYear}
        aria-label={`Next year, ${next}`}
        className={arrowClasses}
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

// Same look as the category bars, for how expenses were paid.
function PaymentMethodBars({ rows, currency, from, to }) {
  const total = rows.reduce((sum, row) => sum + row.totalMinor, 0);
  const largest = rows[0]?.totalMinor ?? 0;
  return (
    <ul className="-mx-2 space-y-1">
      {rows.map((row) => {
        const share = sharePercent(row.totalMinor, total);
        return (
          <li key={row.paymentMethod}>
            <Link
              to={`/transactions?type=expense&paymentMethod=${row.paymentMethod}&from=${from}&to=${to}`}
              className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-600 dark:hover:bg-slate-800/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">
                    {PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod}
                    <span className="font-normal text-slate-500 dark:text-slate-400">
                      {' '}
                      · {row.count} {row.count === 1 ? 'payment' : 'payments'}
                    </span>
                  </span>
                  <span className="shrink-0">
                    <span className="tabular font-semibold">{formatMoney(row.totalMinor, currency)}</span>{' '}
                    <span className="tabular ml-1 inline-block w-9 text-right text-slate-500 dark:text-slate-400">
                      {share === null ? '—' : `${share}%`}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 h-2.5" aria-hidden="true">
                  <div
                    className="h-full min-w-0.5 rounded-r-sm"
                    style={{ width: `${(row.totalMinor / largest) * 100}%`, backgroundColor: 'var(--viz-spending)' }}
                  />
                </div>
              </div>
              <ChevronRight
                className="size-4 shrink-0 text-slate-300 group-hover:text-slate-500 dark:text-slate-600"
                aria-hidden="true"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function DownloadCsvButton({ from, to }) {
  const [state, setState] = useState({ pending: false, error: null });
  async function handleClick() {
    setState({ pending: true, error: null });
    try {
      await downloadTransactionsCsv({ from, to });
      setState({ pending: false, error: null });
    } catch (error) {
      setState({ pending: false, error });
    }
  }
  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="secondary" onClick={handleClick} loading={state.pending}>
        {!state.pending && <Download className="size-4" aria-hidden="true" />}
        Download CSV
      </Button>
      {state.error && <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">{state.error.message}</p>}
    </div>
  );
}

export default function ReportsPage() {
  useDocumentTitle('Reports');
  const { data: user } = useMe();
  const currency = user.currency;
  const today = todayIn(user.timezone);
  const [params, setParams] = useSearchParams();
  const period = readPeriod(params, today);
  const { from, to } = period;

  const rangeError =
    from > to ? 'The start date must be on or before the end date.' : from < '1970-01-01' ? 'Choose a later start date.' : null;

  const report = useQuery({
    queryKey: ['reports', from, to],
    queryFn: ({ signal }) => fetchReport({ from, to }, { signal }),
    placeholderData: keepPreviousData,
    enabled: !rangeError,
  });

  function changeView(view) {
    if (view === 'month') setParams({ view, month: today.slice(0, 7) });
    if (view === 'year') setParams({ view, year: today.slice(0, 4) });
    // Custom starts from the range on screen, so the user only adjusts it.
    if (view === 'custom') setParams({ view, from, to });
  }

  // setParams only sees the URL from the last render, so two quick edits
  // (From, then To) could undo each other. Keep the latest pair until the
  // URL catches up.
  const pendingRange = useRef(null);
  useEffect(() => {
    pendingRange.current = null;
  }, [from, to]);
  function setCustom(field, value) {
    const next = { ...(pendingRange.current ?? { from, to }), [field]: value };
    pendingRange.current = next;
    setParams({ view: 'custom', ...next }, { replace: true });
  }

  const data = report.data;
  const totals = data?.totals;
  const spendingRows = data?.expenseByCategory.filter((row) => !row.isSavings) ?? [];
  const savingsRows = data?.expenseByCategory.filter((row) => row.isSavings) ?? [];
  const hasData = totals && (totals.incomeMinor > 0 || totals.expenseMinor > 0);
  const periodLabel =
    period.view === 'month' ? formatMonth(period.month) : period.view === 'year' ? period.year : `${formatDate(from)} – ${formatDate(to)}`;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Where your money came from and went, for any period."
        actions={!rangeError && <DownloadCsvButton from={from} to={to} />}
      />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <SegmentedControl
          label="Report period"
          name="view"
          options={VIEW_OPTIONS}
          value={period.view}
          onChange={changeView}
          className="w-full sm:w-72"
        />
        {period.view === 'month' && (
          <MonthSwitcher
            month={period.month}
            currentMonth={today.slice(0, 7)}
            onChange={(month) => setParams({ view: 'month', month })}
          />
        )}
        {period.view === 'year' && (
          <YearSwitcher year={period.year} currentYear={today.slice(0, 4)} onChange={(year) => setParams({ view: 'year', year })} />
        )}
        {period.view === 'custom' && (
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
            <TextField
              label="From"
              type="date"
              min="1970-01-01"
              max="2100-12-31"
              value={from}
              onChange={(event) => event.target.value && setCustom('from', event.target.value)}
            />
            <TextField
              label="To"
              type="date"
              min="1970-01-01"
              max="2100-12-31"
              value={to}
              onChange={(event) => event.target.value && setCustom('to', event.target.value)}
              error={rangeError ?? undefined}
            />
          </div>
        )}
      </div>

      {rangeError ? null : report.isPending ? (
        <div className="flex justify-center py-16 text-slate-500">
          <Spinner className="size-6" label="Loading report" />
        </div>
      ) : report.isError && !data ? (
        <Alert
          title="Couldn't load the report."
          action={
            <Button size="sm" variant="secondary" onClick={() => report.refetch()}>
              Try again
            </Button>
          }
        >
          {report.error.message}
        </Alert>
      ) : (
        <div className={`space-y-6 transition-opacity ${report.isPlaceholderData ? 'opacity-60' : ''}`}>
          {report.isError && <Alert>Couldn't refresh: {report.error.message}</Alert>}

          <section aria-label={`Totals for ${periodLabel}`} className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Income" swatch="var(--viz-income)" value={formatMoney(totals.incomeMinor, currency)} />
            <StatTile
              label="Spending"
              swatch="var(--viz-spending)"
              value={formatMoney(totals.spendingMinor, currency)}
              note={
                totals.savedMinor > 0
                  ? `Not counting ${formatMoney(totals.savedMinor, currency)} put into savings & investments.`
                  : undefined
              }
            />
            <StatTile
              label="Saved"
              value={formatMoney(totals.totalSavingsMinor, currency, { signDisplay: 'exceptZero' })}
              note={
                totals.totalSavingsMinor < 0
                  ? 'You spent more than you earned in this period.'
                  : totals.savingsRate !== null
                    ? `${totals.savingsRate}% of your income.`
                    : undefined
              }
            />
          </section>

          {!hasData ? (
            <Card>
              <EmptyState
                icon={ChartColumn}
                title="No transactions in this period"
                description="Choose another period, or add transactions to see them broken down here."
              />
            </Card>
          ) : (
            <>
              {data.byMonth.length > 1 && (
                <Card>
                  <CardTitle description="Select a month to see its report.">Month by month</CardTitle>
                  <TrendChart
                    months={data.byMonth}
                    currency={currency}
                    onSelectMonth={(month) => setParams({ view: 'month', month })}
                  />
                </Card>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardTitle description={periodLabel}>Spending by category</CardTitle>
                  {spendingRows.length > 0 ? (
                    <CategoryBars rows={spendingRows} totalMinor={totals.spendingMinor} currency={currency} from={from} to={to} maxRows={Infinity} />
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No spending in this period.</p>
                  )}
                </Card>

                <Card>
                  <CardTitle description={periodLabel}>Income by category</CardTitle>
                  {data.incomeByCategory.length > 0 ? (
                    <CategoryBars
                      rows={data.incomeByCategory}
                      totalMinor={totals.incomeMinor}
                      currency={currency}
                      from={from}
                      to={to}
                      type="income"
                      maxRows={Infinity}
                    />
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No income in this period.</p>
                  )}
                </Card>

                {savingsRows.length > 0 && (
                  <Card>
                    <CardTitle description="Counted as saved, not spent.">Savings &amp; investments</CardTitle>
                    <CategoryBars rows={savingsRows} totalMinor={totals.savedMinor} currency={currency} from={from} to={to} maxRows={Infinity} />
                  </Card>
                )}

                {data.expenseByPaymentMethod.length > 0 && (
                  <Card>
                    <CardTitle description="All expenses, including savings, by how you paid.">Payment methods</CardTitle>
                    <PaymentMethodBars rows={data.expenseByPaymentMethod} currency={currency} from={from} to={to} />
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      )}

    </>
  );
}
