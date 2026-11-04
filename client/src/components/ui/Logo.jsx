export function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-semibold ${className}`}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-teal-700 dark:fill-teal-600" />
        <path
          d="M8 22l5-6 4 3 7-9"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Finance Tracker</span>
    </span>
  );
}
