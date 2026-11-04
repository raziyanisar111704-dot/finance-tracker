// A row of radio buttons that looks like a switch, e.g. Expense | Income.
// Real radio inputs, so arrow keys and screen readers work as expected.
// options: [{ value, label, checkedClassName? }]
export function SegmentedControl({ label, name, options, value, onChange, className = '' }) {
  return (
    <fieldset className={className}>
      <legend className="sr-only">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-10 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-medium text-slate-600 has-checked:bg-white has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-teal-600 dark:text-slate-300 dark:has-checked:bg-slate-950 ${
              option.checkedClassName ?? 'has-checked:text-slate-900 dark:has-checked:text-slate-100'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
