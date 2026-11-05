import { Trash } from 'lucide-react';
import { useId, useState } from 'react';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Dialog, DialogBody, DialogFooter } from '../../components/ui/Dialog.jsx';
import { SelectField } from '../../components/ui/SelectField.jsx';
import { TextField } from '../../components/ui/TextField.jsx';
import { formatMonth, formatMonthName, addMonths } from '../../lib/dates.js';
import { fieldErrors } from '../../lib/errors.js';
import { currencySymbol, formatMoney, minorToInputString, parseAmount } from '../../lib/money.js';
import { useMe } from '../auth/useAuth.js';
import { CategoryIcon } from '../categories/CategoryIcon.jsx';
import { useCategories } from '../categories/useCategories.js';
import { useSaveBudget } from './useBudgets.js';

function BudgetForm({ budget, month, usedCategoryIds, onDone, onDelete }) {
  const formId = useId();
  const { data: user } = useMe();
  const { categories } = useCategories();
  const save = useSaveBudget();

  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? '');
  const [amount, setAmount] = useState(budget ? minorToInputString(budget.limitMinor, user.currency) : '');
  const [localErrors, setLocalErrors] = useState({});

  // The server reports amount problems on "limitMinor"; the field is "amount".
  const { limitMinor: limitError, ...serverErrors } = fieldErrors(save.error);
  const errors = { ...serverErrors, ...(limitError && { amount: limitError }), ...localErrors };
  const generalError = save.error && Object.keys(errors).length === 0 ? save.error.message : null;

  // Only expense categories have budgets, and only one budget per category a month.
  const options = categories.filter((c) => c.type === 'expense' && !c.archived && !usedCategoryIds.has(c.id));

  function clearErrors() {
    setLocalErrors({});
    if (save.error) save.reset();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const parsed = parseAmount(amount, user.currency);
    const problems = {};
    if (!categoryId) problems.categoryId = 'Choose a category.';
    if (parsed.error) problems.amount = parsed.error;
    setLocalErrors(problems);
    if (Object.keys(problems).length > 0) return;
    if (budget && parsed.minor === budget.limitMinor) return onDone();
    save.mutate({ month, categoryId, limitMinor: parsed.minor }, { onSuccess: onDone });
  }

  const previousName = formatMonthName(addMonths(month, -1));

  return (
    <>
      <DialogBody>
        <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
          {generalError && <Alert>{generalError}</Alert>}

          {budget ? (
            <div className="flex items-center gap-3">
              <CategoryIcon category={budget} />
              <div>
                <p className="font-medium">{budget.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{formatMonth(month)}</p>
              </div>
            </div>
          ) : (
            <SelectField
              label="Category"
              data-autofocus
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                clearErrors();
              }}
              error={errors.categoryId}
              hint={options.length === 0 ? 'Every expense category already has a budget this month.' : undefined}
            >
              <option value="" disabled>
                Choose a category
              </option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
          )}

          <TextField
            label={`Monthly limit (${currencySymbol(user.currency)})`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            data-autofocus={budget ? true : undefined}
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              clearErrors();
            }}
            error={errors.amount}
            hint={
              budget
                ? `Spent so far: ${formatMoney(budget.spentMinor, user.currency)}. In ${previousName}: ${formatMoney(budget.previous.spentMinor, user.currency)}.`
                : 'You get a warning at 80% of the limit.'
            }
            className="[&_input]:text-lg [&_input]:font-semibold"
          />
        </form>
      </DialogBody>

      <DialogFooter>
        {budget && (
          <Button variant="ghost" onClick={() => onDelete(budget)} className="mr-auto text-rose-700 dark:text-rose-400">
            <Trash className="size-4" aria-hidden="true" />
            Remove
          </Button>
        )}
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" form={formId} loading={save.isPending}>
          {budget ? 'Save changes' : 'Add budget'}
        </Button>
      </DialogFooter>
    </>
  );
}

// budget = null → add one for `month`; otherwise change its limit.
export function BudgetFormDialog({ open, budget, month, usedCategoryIds, onClose, onDelete }) {
  return (
    <Dialog open={open} onClose={onClose} title={budget ? 'Edit budget' : `New budget for ${formatMonth(month)}`}>
      <BudgetForm budget={budget} month={month} usedCategoryIds={usedCategoryIds} onDone={onClose} onDelete={onDelete} />
    </Dialog>
  );
}
