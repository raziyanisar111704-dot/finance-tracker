import { Plus } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { formatDate } from '../../lib/dates.js';
import { formatMoney } from '../../lib/money.js';
import { useMe } from '../auth/useAuth.js';
import { useCategories } from '../categories/useCategories.js';
import { TransactionFormDialog } from './TransactionFormDialog.jsx';
import { useDeleteTransaction } from './useTransactions.js';

// Add / edit / delete dialogs for any page that shows transactions.
// Render `dialogs` once on the page and call openAdd() / openEdit(t) / openDelete(t).
export function useTransactionDialogs() {
  const { data: user } = useMe();
  const { byId } = useCategories();
  const remove = useDeleteTransaction();

  // formTransaction: undefined = closed, null = adding, object = editing.
  const [formTransaction, setFormTransaction] = useState(undefined);
  const [deleting, setDeleting] = useState(null);

  function openDelete(transaction) {
    setFormTransaction(undefined);
    remove.reset();
    setDeleting(transaction);
  }

  const dialogs = (
    <>
      <TransactionFormDialog
        open={formTransaction !== undefined}
        transaction={formTransaction ?? null}
        onClose={() => setFormTransaction(undefined)}
        onDelete={openDelete}
      />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        title="Delete transaction?"
        pending={remove.isPending}
        error={remove.error}
      >
        {deleting && (
          <p>
            This removes the {deleting.type} of{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {formatMoney(deleting.amountMinor, user.currency)}
            </strong>{' '}
            ({byId.get(deleting.categoryId)?.name ?? 'Unknown category'}, {formatDate(deleting.date)}). This can't be
            undone.
          </p>
        )}
      </ConfirmDialog>
    </>
  );

  return {
    openAdd: () => setFormTransaction(null),
    openEdit: (transaction) => setFormTransaction(transaction),
    openDelete,
    dialogs,
  };
}

// Phones and tablets: a round "+" button within thumb reach, above the bottom
// bar. The spacer stops it from covering the last row of the page.
export function AddTransactionFab({ onClick }) {
  return (
    <>
      <div className="h-12 lg:hidden" aria-hidden="true" />
      <button
        type="button"
        onClick={onClick}
        aria-label="Add transaction"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 inline-flex size-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 lg:hidden dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        <Plus className="size-6" aria-hidden="true" />
      </button>
    </>
  );
}
