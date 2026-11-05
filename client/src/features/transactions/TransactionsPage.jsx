import { ChevronLeft, ChevronRight, Plus, Receipt, SearchX } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { formatDate, todayIn } from '../../lib/dates.js';
import { formatMoney } from '../../lib/money.js';
import { useMe } from '../auth/useAuth.js';
import { useCategories } from '../categories/useCategories.js';
import { countActiveFilters, TransactionFilters } from './TransactionFilters.jsx';
import { TransactionList } from './TransactionList.jsx';
import { AddTransactionFab, useTransactionDialogs } from './useTransactionDialogs.jsx';
import { useTransactions } from './useTransactions.js';

const PAGE_SIZE = 20;
const FILTER_KEYS = ['q', 'type', 'categoryId', 'paymentMethod', 'from', 'to'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Filters live in the URL (?type=expense&from=…), so refresh, the back button
// and bookmarks all keep them. Values that can't be right (e.g. from an old,
// edited link) are ignored instead of causing an error.
function readFilters(params) {
  const get = (key) => params.get(key) ?? '';
  const valid = {
    q: get('q').slice(0, 100),
    type: ['income', 'expense'].includes(get('type')) ? get('type') : '',
    categoryId: /^[a-f\d]{24}$/i.test(get('categoryId')) ? get('categoryId') : '',
    paymentMethod: get('paymentMethod'),
    from: DATE.test(get('from')) ? get('from') : '',
    to: DATE.test(get('to')) ? get('to') : '',
  };
  if (valid.from && valid.to && valid.from > valid.to) valid.to = '';
  const page = Math.max(1, Number.parseInt(get('page'), 10) || 1);
  return { filters: valid, page };
}

function Total({ label, value, className = '' }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`tabular truncate text-base font-semibold sm:text-lg ${className}`}>{value}</dd>
    </div>
  );
}

export default function TransactionsPage() {
  useDocumentTitle('Transactions');
  const { data: user } = useMe();
  const { categories, byId } = useCategories();
  const [params, setParams] = useSearchParams();
  const { filters, page } = readFilters(params);
  const today = todayIn(user.timezone);

  const list = useTransactions({ ...filters, page, limit: PAGE_SIZE });
  const { openAdd, openEdit, openDelete, dialogs } = useTransactionDialogs();

  function setUrl(patch) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, String(value));
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  }

  // Any filter change starts again from page 1.
  const changeFilters = (patch) => setUrl({ ...patch, page: '' });
  const clearFilters = () => setUrl(Object.fromEntries([...FILTER_KEYS, 'page'].map((key) => [key, ''])));

  function goToPage(nextPage) {
    setUrl({ page: nextPage > 1 ? nextPage : '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Deleting the last item on the last page leaves an empty page: step back.
  const totalPages = list.data?.totalPages;
  useEffect(() => {
    if (totalPages && page > totalPages) setUrl({ page: totalPages > 1 ? totalPages : '' });
  }, [page, totalPages]);

  const hasFilters = countActiveFilters(filters) > 0 || Boolean(filters.q);
  const data = list.data;
  const addButton = (
    <Button onClick={openAdd}>
      <Plus className="size-4" aria-hidden="true" />
      Add transaction
    </Button>
  );

  let content;
  if (list.isPending) {
    content = (
      <div className="flex justify-center py-16 text-slate-500">
        <Spinner className="size-6" label="Loading transactions" />
      </div>
    );
  } else if (list.isError && !data) {
    content = (
      <div className="p-4">
        <Alert
          title="Couldn't load your transactions."
          action={
            <Button size="sm" variant="secondary" onClick={() => list.refetch()}>
              Try again
            </Button>
          }
        >
          {list.error.message}
        </Alert>
      </div>
    );
  } else if (data.total === 0) {
    content = hasFilters ? (
      <EmptyState
        icon={SearchX}
        title="No matching transactions"
        description="Try a different search, or widen the period."
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={Receipt}
        title="No transactions yet"
        description="Add your first income or expense. It takes a few seconds and shows up on every device you use."
        action={addButton}
      />
    );
  } else {
    content = (
      <TransactionList
        items={data.items}
        byId={byId}
        currency={user.currency}
        today={today}
        onEdit={openEdit}
        onDelete={openDelete}
      />
    );
  }

  const net = data ? data.totals.incomeMinor - data.totals.expenseMinor : 0;

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Search, filter and edit your income and expenses."
        // Phones use the round + button instead (below).
        actions={<div className="hidden lg:block">{addButton}</div>}
      />

      <div className="space-y-4">
        <TransactionFilters
          filters={filters}
          onChange={changeFilters}
          onClear={clearFilters}
          categories={categories}
          today={today}
        />

        {data && data.total > 0 && (
          <Card padded={false} className="p-4">
            <dl className="grid grid-cols-3 gap-3">
              <Total
                label="Income"
                value={formatMoney(data.totals.incomeMinor, user.currency)}
                className="text-emerald-700 dark:text-emerald-400"
              />
              <Total label="Expenses" value={formatMoney(data.totals.expenseMinor, user.currency)} />
              <Total label="Net" value={formatMoney(net, user.currency, { signDisplay: 'exceptZero' })} />
            </dl>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {data.total} transaction{data.total === 1 ? '' : 's'}
              {filters.from && filters.to && ` from ${formatDate(filters.from)} to ${formatDate(filters.to)}`}
              {hasFilters && ' matching your filters'}
            </p>
          </Card>
        )}

        {list.isError && data && (
          <Alert>Couldn't refresh the list: {list.error.message} Showing the last loaded data.</Alert>
        )}

        <Card
          padded={false}
          className={`overflow-hidden transition-opacity ${list.isPlaceholderData ? 'opacity-60' : ''}`}
          aria-busy={list.isFetching || undefined}
        >
          {content}
        </Card>

        {data && data.totalPages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-3">
            <Button variant="secondary" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="size-4" aria-hidden="true" />
              Newer
            </Button>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Page {data.page} of {data.totalPages}
            </p>
            <Button variant="secondary" onClick={() => goToPage(page + 1)} disabled={page >= data.totalPages}>
              Older
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </nav>
        )}
      </div>

      <AddTransactionFab onClick={openAdd} />
      {dialogs}
    </>
  );
}
