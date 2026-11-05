import { Pencil, Trash } from 'lucide-react';
import { PAYMENT_METHOD_LABELS } from '../../lib/constants.js';
import { formatDate, formatDayHeading } from '../../lib/dates.js';
import { formatMoney } from '../../lib/money.js';
import { CategoryIcon } from '../categories/CategoryIcon.jsx';

// Income shows as +₹1,500.00 in green; expenses as -₹250.00 in the normal
// text colour (spending isn't an error, so it isn't red).
function Amount({ transaction, currency }) {
  const income = transaction.type === 'income';
  return (
    <span
      className={`tabular whitespace-nowrap font-semibold ${income ? 'text-emerald-700 dark:text-emerald-400' : ''}`}
    >
      <span className="sr-only">{income ? 'Income' : 'Expense'} </span>
      {formatMoney(income ? transaction.amountMinor : -transaction.amountMinor, currency, {
        signDisplay: 'always',
      })}
    </span>
  );
}

const categoryName = (category) => category?.name ?? 'Unknown category';

// Consecutive transactions on the same date, for the phone layout's headings.
function groupByDate(items) {
  const groups = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last?.date === item.date) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  }
  return groups;
}

function MobileList({ items, byId, currency, today, onEdit, className }) {
  return (
    <div className={`divide-y divide-slate-200 dark:divide-slate-800 ${className}`}>
      {groupByDate(items).map((group) => (
        <section key={group.date} aria-label={formatDayHeading(group.date, today)}>
          <h3 className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
            {formatDayHeading(group.date, today)}
          </h3>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {group.items.map((transaction) => {
              const category = byId.get(transaction.categoryId);
              const details = [transaction.notes, PAYMENT_METHOD_LABELS[transaction.paymentMethod]]
                .filter(Boolean)
                .join(' · ');
              return (
                <li key={transaction.id}>
                  <button
                    type="button"
                    onClick={() => onEdit(transaction)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-600 dark:hover:bg-slate-800/50"
                  >
                    <CategoryIcon category={category} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{categoryName(category)}</span>
                      <span className="block truncate text-sm text-slate-500 dark:text-slate-400">{details}</span>
                    </span>
                    <Amount transaction={transaction} currency={currency} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

const iconButton =
  'inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';

function DesktopTable({ items, byId, currency, onEdit, onDelete }) {
  return (
    <table className="hidden w-full text-sm md:table">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <th scope="col" className="px-4 py-3 font-semibold">Date</th>
          <th scope="col" className="px-4 py-3 font-semibold">Category</th>
          <th scope="col" className="px-4 py-3 font-semibold">Notes</th>
          <th scope="col" className="px-4 py-3 font-semibold">Method</th>
          <th scope="col" className="px-4 py-3 text-right font-semibold">Amount</th>
          <th scope="col" className="px-4 py-3">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {items.map((transaction) => {
          const category = byId.get(transaction.categoryId);
          const label = `${categoryName(category)} on ${formatDate(transaction.date)}`;
          return (
            <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="tabular whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                {formatDate(transaction.date)}
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-3">
                  <CategoryIcon category={category} className="size-8" />
                  <span className="font-medium">{categoryName(category)}</span>
                </span>
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-slate-600 dark:text-slate-300" title={transaction.notes}>
                {transaction.notes || <span className="text-slate-400 dark:text-slate-500">—</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                {PAYMENT_METHOD_LABELS[transaction.paymentMethod]}
              </td>
              <td className="px-4 py-3 text-right">
                <Amount transaction={transaction} currency={currency} />
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-right">
                <button type="button" onClick={() => onEdit(transaction)} className={iconButton} aria-label={`Edit ${label}`}>
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(transaction)}
                  className={`${iconButton} hover:text-rose-700 dark:hover:text-rose-400`}
                  aria-label={`Delete ${label}`}
                >
                  <Trash className="size-4" aria-hidden="true" />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// layout="responsive": cards on phones, a table from tablet width up.
// layout="list": cards at every size (e.g. the dashboard's recent list).
export function TransactionList({ layout = 'responsive', ...props }) {
  if (layout === 'list') return <MobileList {...props} className="" />;
  return (
    <>
      <MobileList {...props} className="md:hidden" />
      <DesktopTable {...props} />
    </>
  );
}
