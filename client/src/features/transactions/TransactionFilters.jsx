import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { SelectField } from '../../components/ui/SelectField.jsx';
import { inputClasses, TextField } from '../../components/ui/TextField.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { PAYMENT_METHODS, TRANSACTION_TYPES } from '../../lib/constants.js';
import { datePresets } from '../../lib/dates.js';

// Which preset (if any) the current from/to match.
function currentPeriod(filters, presets) {
  if (!filters.from && !filters.to) return 'all';
  return presets.find((p) => p.from === filters.from && p.to === filters.to)?.value ?? 'custom';
}

export function countActiveFilters(filters) {
  return ['type', 'categoryId', 'paymentMethod'].filter((key) => filters[key]).length +
    (filters.from || filters.to ? 1 : 0);
}

// filters: { q, type, categoryId, paymentMethod, from, to } (strings, '' = not set)
// onChange(patch) updates some of them; onClear() resets everything.
export function TransactionFilters({ filters, onChange, onClear, categories, today }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [search, setSearch] = useState(filters.q);
  const debouncedSearch = useDebouncedValue(search);

  // Send the search text once the user stops typing...
  useEffect(() => {
    if (debouncedSearch !== filters.q) onChange({ q: debouncedSearch });
    // Only when the debounced text changes; filters.q is read, not watched.
  }, [debouncedSearch]);

  // ...and empty the box when the URL's search is cleared elsewhere
  // ("Clear filters", or the browser's back button).
  useEffect(() => {
    if (filters.q !== debouncedSearch) setSearch(filters.q);
  }, [filters.q]);

  const presets = datePresets(today);
  const period = showCustomDates ? 'custom' : currentPeriod(filters, presets);
  const activeCount = countActiveFilters(filters);

  // Only categories of the chosen type; archived ones stay available because
  // old transactions may still use them.
  const visibleCategories = categories.filter((c) => !filters.type || c.type === filters.type);

  function changePeriod(value) {
    setShowCustomDates(value === 'custom');
    if (value === 'custom') return;
    const preset = presets.find((p) => p.value === value);
    onChange({ from: preset?.from ?? '', to: preset?.to ?? '' });
  }

  function changeType(type) {
    const category = categories.find((c) => c.id === filters.categoryId);
    onChange({ type, ...(category && type && category.type !== type ? { categoryId: '' } : {}) });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="transaction-search" className="sr-only">
            Search notes
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="transaction-search"
            type="search"
            placeholder="Search notes"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={100}
            className={inputClasses(false, 'pl-11')}
          />
        </div>
        <Button
          variant="secondary"
          className="md:hidden"
          aria-expanded={panelOpen}
          aria-controls="transaction-filters"
          onClick={() => setPanelOpen((open) => !open)}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-teal-700 px-1.5 text-xs text-white dark:bg-teal-600">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      <div
        id="transaction-filters"
        className={`${panelOpen ? 'grid' : 'hidden'} gap-3 sm:grid-cols-2 md:grid md:grid-cols-4`}
      >
        <SelectField label="Period" value={period} onChange={(event) => changePeriod(event.target.value)}>
          <option value="all">All time</option>
          {presets.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value="custom">Custom dates…</option>
        </SelectField>

        <SelectField label="Type" value={filters.type} onChange={(event) => changeType(event.target.value)}>
          <option value="">All types</option>
          {TRANSACTION_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Category"
          value={filters.categoryId}
          onChange={(event) => onChange({ categoryId: event.target.value })}
        >
          <option value="">All categories</option>
          {TRANSACTION_TYPES.filter((t) => !filters.type || t.value === filters.type).map((t) => (
            <optgroup key={t.value} label={t.label}>
              {visibleCategories
                .filter((c) => c.type === t.value)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.archived ? ' (archived)' : ''}
                  </option>
                ))}
            </optgroup>
          ))}
        </SelectField>

        <SelectField
          label="Payment method"
          value={filters.paymentMethod}
          onChange={(event) => onChange({ paymentMethod: event.target.value })}
        >
          <option value="">All methods</option>
          {PAYMENT_METHODS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>

        {period === 'custom' && (
          <>
            <TextField
              label="From"
              type="date"
              min="1970-01-01"
              max="2100-12-31"
              value={filters.from}
              onChange={(event) => onChange({ from: event.target.value })}
            />
            <TextField
              label="To"
              type="date"
              min={filters.from || '1970-01-01'}
              max="2100-12-31"
              value={filters.to}
              onChange={(event) => onChange({ to: event.target.value })}
            />
          </>
        )}
      </div>

      {(activeCount > 0 || filters.q) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowCustomDates(false);
            onClear();
          }}
        >
          <X className="size-4" aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
