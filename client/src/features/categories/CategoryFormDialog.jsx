import { Check } from 'lucide-react';
import { useId, useState } from 'react';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Dialog, DialogBody, DialogFooter } from '../../components/ui/Dialog.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import { TextField } from '../../components/ui/TextField.jsx';
import { fieldErrors } from '../../lib/errors.js';
import { CATEGORY_COLORS, CategoryGlyph, CategoryIcon, ICON_NAMES } from './CategoryIcon.jsx';
import { useCreateCategory, useUpdateCategory } from './useCategories.js';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

// A grid of radio buttons drawn as swatches or icons. Real radio inputs, so
// arrow keys move between choices and screen readers announce the selection.
function ChoiceGrid({ legend, name, options, value, onChange, renderOption }) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            title={option.label}
            className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 has-checked:border-slate-900 has-checked:ring-2 has-checked:ring-slate-900/15 has-focus-visible:outline-2 has-focus-visible:outline-teal-600 dark:border-slate-700 dark:has-checked:border-slate-100 dark:has-checked:ring-slate-100/20"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="sr-only">{option.label}</span>
            {renderOption(option, value === option.value)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function initialForm(category, type) {
  return category
    ? { type: category.type, name: category.name, color: category.color, icon: category.icon, isSavings: category.isSavings }
    : { type, name: '', color: CATEGORY_COLORS[0], icon: 'tag', isSavings: false };
}

function CategoryForm({ category, defaultType, onDone }) {
  const formId = useId();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const mutation = category ? update : create;

  const [form, setForm] = useState(() => initialForm(category, defaultType));
  const [localErrors, setLocalErrors] = useState({});
  const errors = { ...fieldErrors(mutation.error), ...localErrors };
  const generalError = mutation.error && Object.keys(errors).length === 0 ? mutation.error.message : null;

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setLocalErrors({});
    if (mutation.error) mutation.reset();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return setLocalErrors({ name: 'Enter a name.' });

    const values = { name, color: form.color, icon: form.icon, isSavings: form.type === 'expense' && form.isSavings };
    if (category) {
      const changes = Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== category[key]));
      if (Object.keys(changes).length === 0) return onDone();
      update.mutate({ id: category.id, changes }, { onSuccess: onDone });
    } else {
      create.mutate({ ...values, type: form.type }, { onSuccess: onDone });
    }
  }

  const colorOptions = CATEGORY_COLORS.map((color) => ({ value: color, label: `Colour ${color}` }));
  const iconOptions = ICON_NAMES.map((icon) => ({ value: icon, label: icon.replaceAll('-', ' ') }));

  return (
    <>
      <DialogBody>
        <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-5">
          {generalError && <Alert>{generalError}</Alert>}

          {category ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {category.type === 'expense' ? 'Expense' : 'Income'} category. The type can't be changed, because its
              transactions would switch between income and spending.
            </p>
          ) : (
            <SegmentedControl
              label="Type"
              name="category-type"
              options={TYPE_OPTIONS}
              value={form.type}
              onChange={(type) => setField('type', type)}
            />
          )}

          <div className="flex items-end gap-3">
            <CategoryIcon category={form} className="size-11" />
            <TextField
              label="Name"
              maxLength={40}
              autoComplete="off"
              placeholder={form.type === 'expense' ? 'e.g. Phone & Internet' : 'e.g. Rental income'}
              data-autofocus
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              error={errors.name}
              className="flex-1"
            />
          </div>

          <ChoiceGrid
            legend="Colour"
            name="category-color"
            options={colorOptions}
            value={form.color}
            onChange={(color) => setField('color', color)}
            renderOption={(option, checked) => (
              <span
                className="inline-flex size-7 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: option.value }}
              >
                {checked && <Check className="size-4" aria-hidden="true" />}
              </span>
            )}
          />

          <ChoiceGrid
            legend="Icon"
            name="category-icon"
            options={iconOptions}
            value={form.icon}
            onChange={(icon) => setField('icon', icon)}
            renderOption={(option) => (
              <span style={{ color: form.color }}>
                <CategoryGlyph name={option.value} />
              </span>
            )}
          />

          {form.type === 'expense' && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
              <input
                type="checkbox"
                checked={form.isSavings}
                onChange={(event) => setField('isSavings', event.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-teal-700"
              />
              <span className="text-sm">
                <span className="block font-medium">Counts as savings</span>
                <span className="mt-0.5 block text-slate-500 dark:text-slate-400">
                  Money put here (an FD, SIP or savings pot) is shown as saved, not spent.
                </span>
              </span>
            </label>
          )}
        </form>
      </DialogBody>

      <DialogFooter>
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" form={formId} loading={mutation.isPending}>
          {category ? 'Save changes' : 'Add category'}
        </Button>
      </DialogFooter>
    </>
  );
}

// category = null → add a new one of `defaultType`; otherwise edit it.
export function CategoryFormDialog({ open, category, defaultType = 'expense', onClose }) {
  return (
    <Dialog open={open} onClose={onClose} title={category ? 'Edit category' : 'New category'}>
      <CategoryForm category={category} defaultType={defaultType} onDone={onClose} />
    </Dialog>
  );
}
