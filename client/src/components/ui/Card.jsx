// padded={false} for content that runs edge to edge (lists, tables). Passing
// "p-0" in className wouldn't work: both classes would apply and p-5 wins.
export function Card({ as: Element = 'section', padded = true, className = '', children, ...props }) {
  return (
    <Element
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${padded ? 'p-5' : ''} ${className}`}
      {...props}
    >
      {children}
    </Element>
  );
}

export function CardTitle({ children, description }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold">{children}</h2>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  );
}
