import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

// A change compared with last month. Colour depends on direction AND on
// whether up is good (income up = good, spending up = bad), and it always
// comes with an arrow and words, so it never relies on colour alone.
// text: e.g. "12.5% vs October" (already formatted); null = nothing to compare.
export function Delta({ direction, goodWhenUp, text }) {
  if (direction === 0) {
    return (
      <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
        <Minus className="size-4" aria-hidden="true" />
        {text}
      </p>
    );
  }
  const good = direction > 0 === goodWhenUp;
  const Icon = direction > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <p
      className={`flex items-center gap-1 text-sm font-medium ${
        good ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
      }`}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="sr-only">{direction > 0 ? 'Up' : 'Down'} </span>
        {text}
      </span>
    </p>
  );
}

// label · value · optional change line · optional note.
// Reports pass no delta (no comparison), so no empty line is reserved.
// Big numbers use normal (proportional) digits: tabular digits look loose at this size.
export function StatTile({ label, value, delta, note, swatch }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        {/* Same colour key as the chart, so "Spending" here = orange columns there. */}
        {swatch && <span className="size-2.5 rounded-sm" style={{ backgroundColor: swatch }} aria-hidden="true" />}
        {label}
      </p>
      <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</p>
      {delta && <div className="mt-1.5 min-h-5">{delta}</div>}
      {note && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note}</p>}
    </div>
  );
}
