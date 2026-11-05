import { ChartColumn, Table } from 'lucide-react';
import { useState } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth.js';
import { formatMonth, formatMonthShort } from '../../lib/dates.js';
import { formatMoney, formatMoneyCompact, minorUnitDigits } from '../../lib/money.js';

const SERIES = [
  { key: 'incomeMinor', label: 'Income', color: 'var(--viz-income)' },
  { key: 'spendingMinor', label: 'Spending', color: 'var(--viz-spending)' },
];

// Layout in pixels. The SVG's height includes the month labels, so the card
// never gets a scrollbar of its own.
const TOP = 12;
const PLOT_HEIGHT = 180;
const X_AXIS = 28;
const LEFT = 52; // room for "₹2.5L"
const RIGHT = 4;
const MAX_BAR = 24;
const GAP = 2; // surface-coloured gap between the two columns of a month

// Clean axis steps (1, 2, 2.5 or 5 × 10ⁿ in whole rupees), about 4 of them.
function niceTicks(maxMinor, currency) {
  const factor = 10 ** minorUnitDigits(currency);
  const max = maxMinor / factor;
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough);
  const count = Math.max(1, Math.ceil(max / step - 1e-9));
  return Array.from({ length: count + 1 }, (_, i) => Math.round(i * step * factor));
}

// A column with 4px rounded top corners and a square bottom on the baseline.
function columnPath(x, y, width, height) {
  const r = Math.min(4, width / 2, height);
  return `M${x},${y + height}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + width - r}A${r},${r} 0 0 1 ${x + width},${y + r}V${y + height}Z`;
}

function Legend({ month, currency }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {SERIES.map((series) => (
        <li key={series.key} className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: series.color }} aria-hidden="true" />
          <span className="text-slate-600 dark:text-slate-300">{series.label}</span>
          {/* The selected month's value, so the latest numbers are readable without hovering. */}
          {month && <span className="font-semibold">{formatMoney(month[series.key], currency)}</span>}
        </li>
      ))}
    </ul>
  );
}

function TrendTable({ months, currency }) {
  return (
    <div className="overflow-x-auto">
      <table className="tabular w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th scope="col" className="py-2 pr-4 font-semibold">Month</th>
            <th scope="col" className="py-2 pr-4 text-right font-semibold">Income</th>
            <th scope="col" className="py-2 pr-4 text-right font-semibold">Spending</th>
            <th scope="col" className="py-2 text-right font-semibold">Saved</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {months.map((m) => (
            <tr key={m.month}>
              <th scope="row" className="whitespace-nowrap py-2 pr-4 text-left font-medium">{formatMonth(m.month)}</th>
              <td className="whitespace-nowrap py-2 pr-4 text-right">{formatMoney(m.incomeMinor, currency)}</td>
              <td className="whitespace-nowrap py-2 pr-4 text-right">{formatMoney(m.spendingMinor, currency)}</td>
              <td className="whitespace-nowrap py-2 text-right">
                {formatMoney(m.totalSavingsMinor, currency, { signDisplay: 'exceptZero' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TOOLTIP_WIDTH = 192;

function Tooltip({ month, currency, left }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-10 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800"
      style={{ top: TOP, left, width: TOOLTIP_WIDTH }}
    >
      <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{formatMonth(month.month)}</p>
      <ul className="space-y-1">
        {SERIES.map((series) => (
          <li key={series.key} className="flex items-center gap-2">
            {/* Tooltips key series with a short line, not a box. */}
            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: series.color }} />
            <span className="tabular font-semibold">{formatMoney(month[series.key], currency)}</span>
            <span className="text-slate-500 dark:text-slate-400">{series.label}</span>
          </li>
        ))}
        <li className="flex items-center gap-2 border-t border-slate-200 pt-1 dark:border-slate-700">
          <span className="w-3" />
          <span className="tabular font-semibold">
            {formatMoney(month.totalSavingsMinor, currency, { signDisplay: 'exceptZero' })}
          </span>
          <span className="text-slate-500 dark:text-slate-400">Saved</span>
        </li>
      </ul>
    </div>
  );
}

// Income vs spending per month. selectedMonth (optional) is highlighted.
// onSelectMonth(month): clicking a month opens that month.
export function TrendChart({ months, currency, selectedMonth, onSelectMonth }) {
  const [ref, width] = useElementWidth();
  const [active, setActive] = useState(null);
  const [view, setView] = useState('chart');

  const max = Math.max(0, ...months.flatMap((m) => SERIES.map((s) => m[s.key])));
  const selected = months.find((m) => m.month === selectedMonth);

  const ticks = max > 0 ? niceTicks(max, currency) : [0];
  const yMax = ticks.at(-1) || 1;
  const plotWidth = Math.max(0, width - LEFT - RIGHT);
  const band = plotWidth / months.length;
  const barWidth = Math.max(2, Math.min(MAX_BAR, (band * 0.6 - GAP) / 2));
  const y = (value) => TOP + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT;

  // Long ranges (reports): label every 2nd, 3rd… month so labels never
  // overlap, counted back from the latest month. Ranges that cross a year
  // say which year: "Jan ’26".
  const multiYear = months[0].month.slice(0, 4) !== months.at(-1).month.slice(0, 4);
  const labelEvery = Math.max(1, Math.ceil((months.length * (multiYear ? 52 : 34)) / Math.max(1, plotWidth)));
  const monthLabel = (month) => (multiYear ? `${formatMonthShort(month)} ’${month.slice(2, 4)}` : formatMonthShort(month));

  const toggle = (
    <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800" role="group" aria-label="View">
      {[
        { value: 'chart', label: 'Chart', icon: ChartColumn },
        { value: 'table', label: 'Table', icon: Table },
      ].map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => setView(value)}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-600 focus-visible:outline-2 focus-visible:outline-teal-600 aria-pressed:bg-white aria-pressed:text-slate-900 aria-pressed:shadow-sm dark:text-slate-300 dark:aria-pressed:bg-slate-950 dark:aria-pressed:text-slate-100"
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Legend month={selected} currency={currency} />
        {toggle}
      </div>

      {view === 'table' ? (
        <TrendTable months={months} currency={currency} />
      ) : (
        <div ref={ref} className="relative" style={{ height: TOP + PLOT_HEIGHT + X_AXIS }}>
          {width > 0 && (
            <>
              <svg width={width} height={TOP + PLOT_HEIGHT + X_AXIS} aria-hidden="true" className="block">
                {/* Hairline gridlines; the zero line is the (slightly darker) baseline. */}
                {ticks.map((tick) => (
                  <g key={tick}>
                    <line
                      x1={LEFT}
                      x2={width - RIGHT}
                      y1={y(tick)}
                      y2={y(tick)}
                      stroke={tick === 0 ? 'var(--viz-axis)' : 'var(--viz-grid)'}
                      shapeRendering="crispEdges"
                    />
                    <text
                      x={LEFT - 8}
                      y={y(tick)}
                      dy="0.32em"
                      textAnchor="end"
                      className="tabular fill-slate-500 text-[11px] dark:fill-slate-400"
                    >
                      {formatMoneyCompact(tick, currency)}
                    </text>
                  </g>
                ))}

                {active !== null && (
                  <rect x={LEFT + active * band} y={TOP} width={band} height={PLOT_HEIGHT} fill="var(--viz-grid)" opacity="0.6" />
                )}

                {months.map((m, i) => {
                  const center = LEFT + i * band + band / 2;
                  const start = center - (barWidth * SERIES.length + GAP) / 2;
                  return (
                    <g key={m.month}>
                      {SERIES.map((series, s) => {
                        const value = m[series.key];
                        if (value <= 0) return null;
                        const top = y(value);
                        // Tiny amounts still get a visible 1px sliver.
                        const height = Math.max(1, TOP + PLOT_HEIGHT - top);
                        return (
                          <path
                            key={series.key}
                            d={columnPath(start + s * (barWidth + GAP), TOP + PLOT_HEIGHT - height, barWidth, height)}
                            fill={series.color}
                          />
                        );
                      })}
                      {(months.length - 1 - i) % labelEvery === 0 && (
                        <text
                          x={center}
                          y={TOP + PLOT_HEIGHT + 18}
                          textAnchor="middle"
                          className={`text-[11px] ${
                            m.month === selectedMonth
                              ? 'fill-slate-900 font-semibold dark:fill-slate-100'
                              : 'fill-slate-500 dark:fill-slate-400'
                          }`}
                        >
                          {monthLabel(m.month)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* One invisible button per month: a big hit area for mouse, touch
                  and keyboard, with the full numbers for screen readers. */}
              {months.map((m, i) => (
                <button
                  key={m.month}
                  type="button"
                  className="absolute rounded-lg focus-visible:outline-2 focus-visible:outline-teal-600"
                  style={{ left: LEFT + i * band, top: 0, width: band, height: TOP + PLOT_HEIGHT + X_AXIS }}
                  aria-label={`${formatMonth(m.month)}: income ${formatMoney(m.incomeMinor, currency)}, spending ${formatMoney(m.spendingMinor, currency)}. Show this month.`}
                  aria-current={m.month === selectedMonth ? 'date' : undefined}
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onClick={() => onSelectMonth(m.month)}
                />
              ))}

              {active !== null && (
                <Tooltip
                  month={months[active]}
                  currency={currency}
                  // Beside the hovered month so it doesn't hide its columns, but
                  // always inside the card.
                  left={
                    active < months.length / 2
                      ? Math.min(LEFT + (active + 1) * band + 4, width - TOOLTIP_WIDTH)
                      : Math.max(0, LEFT + active * band - TOOLTIP_WIDTH - 4)
                  }
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
