// Transaction dates are calendar dates ("YYYY-MM-DD"), not moments in time.
// They are displayed in UTC so a browser time zone can never shift them a day.

// Today's date in the user's chosen time zone (e.g. Asia/Kolkata), which may
// differ from the device's time zone when travelling.
export function todayIn(timeZone) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function toUtcDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// "2026-11-04" → "2026-11-03"
export function addDays(dateString, days) {
  const date = toUtcDate(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// First and last day of the month containing `dateString`, shifted by
// `offset` months: ("2026-11-04", -1) → { from: "2026-10-01", to: "2026-10-31" }.
export function monthBounds(dateString, offset = 0) {
  const [year, month] = dateString.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1 + offset, 1));
  const last = new Date(Date.UTC(year, month + offset, 0)); // day 0 = last day of previous month
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

// Quick date ranges for filters. `today` comes from todayIn(user.timezone).
export function datePresets(today) {
  const year = today.slice(0, 4);
  return [
    { value: 'this-month', label: 'This month', ...monthBounds(today) },
    { value: 'last-month', label: 'Last month', ...monthBounds(today, -1) },
    { value: 'last-30-days', label: 'Last 30 days', from: addDays(today, -29), to: today },
    { value: 'this-year', label: 'This year', from: `${year}-01-01`, to: `${year}-12-31` },
  ];
}

const formatters = {
  short: new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }),
  // en-GB: "Sun 25 Oct 2026" (en-IN would add a comma before the year).
  long: new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }),
};

// "2026-11-04" → "4 Nov 2026"
export const formatDate = (dateString) => formatters.short.format(toUtcDate(dateString));

// "2026-11" + 1 → "2026-12", "2026-01" - 1 → "2025-12"
export function addMonths(month, count) {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthIndex - 1 + count, 1)).toISOString().slice(0, 7);
}

const monthFormatters = {
  long: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }),
  name: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long' }),
  // en-US: "Sep" (en-GB says "Sept").
  short: new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' }),
};

// "2026-11" → "November 2026" / "November" / "Nov"
export const formatMonth = (month) => monthFormatters.long.format(toUtcDate(`${month}-01`));
export const formatMonthName = (month) => monthFormatters.name.format(toUtcDate(`${month}-01`));
export const formatMonthShort = (month) => monthFormatters.short.format(toUtcDate(`${month}-01`));

// Heading for a day in a list: "Today", "Yesterday" or "Mon, 2 Nov 2026".
export function formatDayHeading(dateString, today) {
  if (dateString === today) return 'Today';
  if (dateString === addDays(today, -1)) return 'Yesterday';
  return formatters.long.format(toUtcDate(dateString));
}
