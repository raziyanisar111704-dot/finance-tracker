import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { inputClasses } from './TextField.jsx';

// A labelled native <select>: on phones it opens the system picker, which is
// easier to use than any custom dropdown.
export function SelectField({ label, error, hint, id, className = '', children, ...selectProps }) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className={className}>
      <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          className={inputClasses(error, 'appearance-none pr-10')}
          {...selectProps}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-500"
          aria-hidden="true"
        />
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
