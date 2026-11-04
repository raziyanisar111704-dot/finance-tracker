import { DATE_PATTERN } from '../constants.js';

// All dates are calendar strings: "YYYY-MM-DD" for days, "YYYY-MM" for months.
// They are never converted to timestamps, so time zones can't shift them.

const pad2 = (n) => String(n).padStart(2, '0');

// Accepts any IANA time zone the JavaScript runtime knows, e.g. "Asia/Kolkata".
export function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

// "2026-02-28" → true, "2026-02-30" → false (the pattern alone would allow it).
export function isValidDateString(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

// Today's calendar date for someone in `timeZone`. At 00:30 IST on 1 Nov it
// is still 31 Oct in UTC; this returns "…-11-01" for "Asia/Kolkata".
export function todayIn(timeZone, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// "2026-02" → { from: "2026-02-01", to: "2026-02-28" }
export function monthRange(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  // Day 0 of the next month is the last day of this month.
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${pad2(lastDay)}` };
}

// addMonths("2026-01", -1) → "2025-12"
export function addMonths(month, delta) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

// monthsBetween("2026-11", "2027-01") → ["2026-11", "2026-12", "2027-01"]
export function monthsBetween(fromMonth, toMonth) {
  const months = [];
  for (let month = fromMonth; month <= toMonth; month = addMonths(month, 1)) {
    months.push(month);
  }
  return months;
}
