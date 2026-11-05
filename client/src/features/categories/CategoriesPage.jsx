import { Archive, ArchiveRestore, ChevronLeft, Pencil, Plus, Tags, Trash } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import { SelectField } from '../../components/ui/SelectField.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { linkClasses } from '../auth/AuthLayout.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { CategoryFormDialog } from './CategoryFormDialog.jsx';
import { CategoryIcon } from './CategoryIcon.jsx';
import { useCategories, useDeleteCategory, useUpdateCategory } from './useCategories.js';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

const iconButton =
  'inline-flex size-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-600 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';

function CategoryRow({ category, onEdit, onDelete }) {
  const update = useUpdateCategory();
  const archived = category.archived;
  const ArchiveIcon = archived ? ArchiveRestore : Archive;

  return (
    <li className="px-5 py-3">
      <div className="flex items-center gap-3">
        <CategoryIcon category={category} />
        <div className="min-w-0 flex-1">
          <p className={`truncate font-medium ${archived ? 'text-slate-500 dark:text-slate-400' : ''}`}>{category.name}</p>
          {category.isSavings && <p className="text-xs text-slate-500 dark:text-slate-400">Counts as savings</p>}
        </div>
        <div className="flex shrink-0">
          {!archived && (
            <button type="button" className={iconButton} onClick={() => onEdit(category)} aria-label={`Edit ${category.name}`}>
              <Pencil className="size-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className={iconButton}
            disabled={update.isPending}
            onClick={() => update.mutate({ id: category.id, changes: { archived: !archived } })}
            aria-label={`${archived ? 'Restore' : 'Archive'} ${category.name}`}
            title={archived ? 'Restore' : 'Archive: hide from forms, keep history'}
          >
            {update.isPending ? <Spinner className="size-4" /> : <ArchiveIcon className="size-4" aria-hidden="true" />}
          </button>
          <button type="button" className={iconButton} onClick={() => onDelete(category)} aria-label={`Delete ${category.name}`}>
            <Trash className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {update.error && <Alert className="mt-3">{update.error.message}</Alert>}
    </li>
  );
}

function DeleteCategoryDialog({ category, categories, onClose }) {
  const remove = useDeleteCategory();
  // Transactions can only move to an active category of the same type.
  const targets = category
    ? categories.filter((c) => c.type === category.type && !c.archived && c.id !== category.id)
    : [];
  const fallback = targets.find((c) => /^other/i.test(c.name)) ?? targets[0];
  const [moveTo, setMoveTo] = useState('');
  const target = moveTo || fallback?.id || '';

  function close() {
    remove.reset();
    setMoveTo('');
    onClose();
  }

  return (
    <ConfirmDialog
      open={category !== null}
      onClose={close}
      onConfirm={() => remove.mutate({ id: category.id, moveTo: target || undefined }, { onSuccess: close })}
      title={`Delete "${category?.name}"?`}
      confirmLabel="Delete category"
      pending={remove.isPending}
      error={remove.error}
    >
      {category && (
        <>
          <p>
            Its budgets are deleted. Prefer to keep the history? <strong className="text-slate-900 dark:text-slate-100">Archive</strong>{' '}
            it instead: it disappears from forms but old transactions keep it.
          </p>
          {targets.length > 0 ? (
            <SelectField
              label="Move its transactions to"
              value={target}
              onChange={(event) => setMoveTo(event.target.value)}
              hint="If it has no transactions, nothing is moved."
            >
              {targets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
          ) : (
            <p>
              There's no other {category.type} category to move its transactions to, so it can only be deleted if it has no
              transactions.
            </p>
          )}
        </>
      )}
    </ConfirmDialog>
  );
}

export default function CategoriesPage() {
  useDocumentTitle('Categories');
  const { categories, isPending, error, refetch } = useCategories();
  const [params, setParams] = useSearchParams();
  const type = params.get('type') === 'income' ? 'income' : 'expense';

  // editing: undefined = closed, null = adding, object = editing.
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);

  const ofType = categories.filter((c) => c.type === type);
  const active = ofType.filter((c) => !c.archived);
  const archived = ofType.filter((c) => c.archived);

  const rowProps = { onEdit: setEditing, onDelete: setDeleting };

  return (
    <>
      <Link to="/settings" className={`-ml-1 mb-1 inline-flex min-h-11 items-center gap-1 pr-2 text-sm ${linkClasses}`}>
        <ChevronLeft className="size-4" aria-hidden="true" />
        Settings
      </Link>
      <PageHeader
        title="Categories"
        description="Group your transactions. Archived categories stay on old transactions but leave the forms."
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus className="size-4" aria-hidden="true" />
            Add category
          </Button>
        }
      />

      <SegmentedControl
        label="Category type"
        name="type"
        options={TYPE_OPTIONS}
        value={type}
        onChange={(next) => setParams(next === 'expense' ? {} : { type: next }, { replace: true })}
        className="mb-4 max-w-xs"
      />

      {isPending ? (
        <div className="flex justify-center py-16 text-slate-500">
          <Spinner className="size-6" label="Loading categories" />
        </div>
      ) : error ? (
        <Alert
          title="Couldn't load your categories."
          action={
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          }
        >
          {error.message}
        </Alert>
      ) : (
        <div className="space-y-6">
          <Card padded={false}>
            {active.length > 0 ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {active.map((category) => (
                  <CategoryRow key={category.id} category={category} {...rowProps} />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Tags}
                title={`No ${type} categories`}
                description="Add one to start recording transactions of this type."
              />
            )}
          </Card>

          {archived.length > 0 && (
            <section aria-labelledby="archived-heading">
              <h2 id="archived-heading" className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Archived
              </h2>
              <Card padded={false}>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {archived.map((category) => (
                    <CategoryRow key={category.id} category={category} {...rowProps} />
                  ))}
                </ul>
              </Card>
            </section>
          )}
        </div>
      )}

      <CategoryFormDialog
        open={editing !== undefined}
        category={editing ?? null}
        defaultType={type}
        onClose={() => setEditing(undefined)}
      />
      <DeleteCategoryDialog category={deleting} categories={categories} onClose={() => setDeleting(null)} />
    </>
  );
}
