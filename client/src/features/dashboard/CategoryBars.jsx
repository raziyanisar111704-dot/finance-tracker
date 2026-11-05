import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { formatMoney, sharePercent } from '../../lib/money.js';
import { CategoryIcon } from '../categories/CategoryIcon.jsx';

const MAX_ROWS = 6;

// Ranked horizontal bars, largest first, all in the spending colour (the
// category is named next to each bar, so colour doesn't need to tell them
// apart). Bars are easier to compare than slices of a pie.
// rows: [{ categoryId, name, icon, color, totalMinor }] sorted largest first.
export function CategoryBars({ rows, totalMinor, currency, from, to }) {
  // Past six categories, the rest fold into one "N more" row.
  const shown = rows.length > MAX_ROWS ? rows.slice(0, MAX_ROWS - 1) : rows;
  const rest = rows.slice(shown.length);
  const restTotal = rest.reduce((sum, row) => sum + row.totalMinor, 0);
  const largest = Math.max(shown[0]?.totalMinor ?? 0, restTotal);

  const items = shown.map((row) => ({
    key: row.categoryId,
    label: row.name,
    category: row,
    totalMinor: row.totalMinor,
    to: `/transactions?categoryId=${row.categoryId}&from=${from}&to=${to}`,
  }));
  if (rest.length > 0) {
    items.push({
      key: 'more',
      label: `${rest.length} more categories`,
      category: null,
      totalMinor: restTotal,
      to: `/transactions?type=expense&from=${from}&to=${to}`,
    });
  }

  return (
    <ul className="-mx-2 space-y-1">
      {items.map((item) => {
        const share = sharePercent(item.totalMinor, totalMinor);
        return (
          <li key={item.key}>
            <Link
              to={item.to}
              className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-600 dark:hover:bg-slate-800/50"
            >
              <CategoryIcon category={item.category} className="size-9" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{item.label}</span>
                  <span className="shrink-0">
                    <span className="tabular font-semibold">{formatMoney(item.totalMinor, currency)}</span>
                    {/* A real space, so screen readers don't read "₹15,000.0080%". */}{' '}
                    <span className="tabular ml-1 inline-block w-9 text-right text-slate-500 dark:text-slate-400">
                      {share === null ? '—' : `${share}%`}
                    </span>
                  </span>
                </div>
                {/* Square at the start (the baseline), 4px rounded at the end. */}
                <div className="mt-1.5 h-2.5" aria-hidden="true">
                  <div
                    className="h-full min-w-0.5 rounded-r-sm"
                    style={{
                      width: `${(item.totalMinor / largest) * 100}%`,
                      backgroundColor: 'var(--viz-spending)',
                    }}
                  />
                </div>
              </div>
              <ChevronRight
                className="size-4 shrink-0 text-slate-300 group-hover:text-slate-500 dark:text-slate-600"
                aria-hidden="true"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
