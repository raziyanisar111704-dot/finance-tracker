import { DATE_PATTERN } from '../constants.js';

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
