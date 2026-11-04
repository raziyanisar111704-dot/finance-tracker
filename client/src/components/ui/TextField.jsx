import { useId } from 'react';

// text-base (16px) stops iPhone Safari from zooming in when the field is focused.
export function inputClasses(error, extra = '') {
  return `block min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
    error
      ? 'border-rose-500 focus:ring-rose-500/30'
      : 'border-slate-300 focus:border-teal-600 focus:ring-teal-600/30 dark:border-slate-700'
  } ${extra}`;
}

// Labelled input with hint and error text, wired up for screen readers.
// `trailing` renders a control inside the right edge (e.g. show-password).
export function TextField({ label, error, hint, id, trailing, className = '', ...inputProps }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          className={inputClasses(error, trailing ? 'pr-12' : '')}
          {...inputProps}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</div>}
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
