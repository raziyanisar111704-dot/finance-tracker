import { Trash } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Dialog, DialogBody, DialogFooter } from '../../components/ui/Dialog.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import { SelectField } from '../../components/ui/SelectField.jsx';
import { TextField } from '../../components/ui/TextField.jsx';
import { PAYMENT_METHODS } from '../../lib/constants.js';
import { todayIn } from '../../lib/dates.js';
import { fieldErrors } from '../../lib/errors.js';
import { currencySymbol, formatMoney, minorToInputString, parseAmount } from '../../lib/money.js';
import { useMe } from '../auth/useAuth.js';
import { useCategories } from '../categories/useCategories.js';
import { useCreateTransaction, useUpdateTransaction } from './useTransactions.js';

const TYPE_OPTIONS = [
  {
    value: 'expense',
    label: 'Expense',
    checkedClassName: 'has-checked:text-rose-700 dark:has-checked:text-rose-300',
  },
  {
    value: 'income',
    label: 'Income',
    checkedClassName: 'has-checked:text-emerald-700 dark:has-checked:text-emerald-300',
  },
];

function initialForm(transaction, user) {
  if (transaction) {
    return {
      type: transaction.type,
      amount: minorToInputString(transaction.amountMinor, user.currency),
      categoryId: transaction.categoryId,
      date: transaction.date,
      paymentMethod: transaction.paymentMethod,
      notes: transaction.notes,
    };
  }
  return {
    type: 'expense',
    amount: '',
    categoryId: '',
    date: todayIn(user.timezone),
    paymentMethod: 'upi',
    notes: '',
  };
}

// The server reports amount problems on "amountMinor"; the form field is "amount".
function serverFieldErrors(error) {
  const { amountMinor, ...rest } = fieldErrors(error);
  return amountMinor ? { ...rest, amount: amountMinor } : rest;
}

function TransactionForm({ transaction, onDone, onDelete }) {
  const formId = useId();
  const { data: user } = useMe();
  const { categories, isPending: categoriesLoading, error: categoriesError, refetch } = useCategories();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const mutation = transaction ? update : create;

  const [form, setForm] = useState(() => initialForm(transaction, user));
  const [localErrors, setLocalErrors] = useState({});
  const [savedMessage, setSavedMessage] = useState('');
  const amountRef = useRef(null);

  const errors = { ...serverFieldErrors(mutation.error), ...localErrors };
  const generalError = mutation.error && Object.keys(errors).length === 0 ? mutation.error.message : null;

  // Archived categories are hidden, except the one this transaction already uses.
  const categoryOptions = categories.filter(
    (category) =>
      category.type === form.type && (!category.archived || category.id === transaction?.categoryId),
  );

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setLocalErrors(({ [field]: _removed, ...rest }) => rest);
    setSavedMessage('');
    if (mutation.error) mutation.reset();
  }

  function changeType(type) {
    // A category belongs to one type, so switching type clears it (or restores
    // the original one when switching back while editing).
    setForm((current) => ({
      ...current,
      type,
      categoryId: type === transaction?.type ? transaction.categoryId : '',
    }));
    setLocalErrors({});
    if (mutation.error) mutation.reset();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const addAnother = event.nativeEvent.submitter?.value === 'another';

    const amount = parseAmount(form.amount, user.currency);
    const problems = {};
    if (amount.error) problems.amount = amount.error;
    if (!form.categoryId) problems.categoryId = 'Choose a category.';
    if (!form.date) problems.date = 'Choose a date.';
    setLocalErrors(problems);
    if (Object.keys(problems).length > 0) return;

    const values = {
      type: form.type,
      amountMinor: amount.minor,
      categoryId: form.categoryId,
      date: form.date,
      paymentMethod: form.paymentMethod,
      notes: form.notes.trim(),
    };

    if (transaction) {
      const changes = Object.fromEntries(
        Object.entries(values).filter(([key, value]) => value !== transaction[key]),
      );
      if (Object.keys(changes).length === 0) return onDone();
      update.mutate({ id: transaction.id, changes }, { onSuccess: onDone });
      return;
    }

    create.mutate(values, {
      onSuccess: (saved) => {
        if (!addAnother) return onDone();
        // Keep type, category, date and payment method: the next entry is
        // usually similar. Clear what is different every time.
        setForm((current) => ({ ...current, amount: '', notes: '' }));
        setSavedMessage(`Saved ${formatMoney(saved.amountMinor, user.currency)}. Add the next one.`);
        amountRef.current?.focus();
      },
    });
  }

  return (
    <>
      <DialogBody>
        <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
          {generalError && <Alert>{generalError}</Alert>}
          {savedMessage && <Alert tone="success">{savedMessage}</Alert>}

          <SegmentedControl
            label="Type"
            name="type"
            options={TYPE_OPTIONS}
            value={form.type}
            onChange={changeType}
          />

          <TextField
            ref={amountRef}
            label={`Amount (${currencySymbol(user.currency)})`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            data-autofocus={transaction ? undefined : true}
            value={form.amount}
            onChange={(event) => setField('amount', event.target.value)}
            error={errors.amount}
            className="[&_input]:text-lg [&_input]:font-semibold"
          />

          {categoriesError ? (
            <Alert
              title="Couldn't load your categories."
              action={
                <Button size="sm" variant="secondary" onClick={() => refetch()}>
                  Try again
                </Button>
              }
            >
              {categoriesError.message}
            </Alert>
          ) : (
            <SelectField
              label="Category"
              value={form.categoryId}
              onChange={(event) => setField('categoryId', event.target.value)}
              disabled={categoriesLoading}
              error={errors.categoryId}
              hint={
                !categoriesLoading && categoryOptions.length === 0
                  ? `You have no ${form.type} categories. You can add them in step 4.4.`
                  : undefined
              }
            >
              <option value="" disabled>
                {categoriesLoading ? 'Loading categories…' : 'Choose a category'}
              </option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.archived ? ' (archived)' : ''}
                </option>
              ))}
            </SelectField>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Date"
              type="date"
              min="1970-01-01"
              max="2100-12-31"
              value={form.date}
              onChange={(event) => setField('date', event.target.value)}
              error={errors.date}
            />
            <SelectField
              label="Payment method"
              value={form.paymentMethod}
              onChange={(event) => setField('paymentMethod', event.target.value)}
              error={errors.paymentMethod}
            >
              {PAYMENT_METHODS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>

          <TextField
            label="Notes (optional)"
            placeholder="e.g. Weekly vegetables"
            maxLength={500}
            value={form.notes}
            onChange={(event) => setField('notes', event.target.value)}
            error={errors.notes}
            hint="Searchable. Don't enter card numbers, PINs or passwords."
          />
        </form>
      </DialogBody>

      <DialogFooter>
        {transaction && (
          <Button variant="ghost" onClick={() => onDelete(transaction)} className="mr-auto text-rose-700 dark:text-rose-400">
            <Trash className="size-4" aria-hidden="true" />
            Delete
          </Button>
        )}
        {!transaction && (
          <Button type="submit" form={formId} value="another" variant="secondary" disabled={create.isPending}>
            Save &amp; add another
          </Button>
        )}
        <Button type="submit" form={formId} value="save" loading={mutation.isPending}>
          {transaction ? 'Save changes' : 'Save'}
        </Button>
      </DialogFooter>
    </>
  );
}

// transaction = null → add a new one; otherwise edit it.
export function TransactionFormDialog({ open, transaction, onClose, onDelete }) {
  return (
    <Dialog open={open} onClose={onClose} title={transaction ? 'Edit transaction' : 'Add transaction'}>
      <TransactionForm transaction={transaction} onDone={onClose} onDelete={onDelete} />
    </Dialog>
  );
}
