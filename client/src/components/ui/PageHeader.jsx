// printHidden: leave the header off paper (the page prints its own heading).
export function PageHeader({ title, description, actions, printHidden = false }) {
  return (
    <div data-print={printHidden ? 'hide' : undefined} className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
