// Amounts are integers in the currency's smallest unit (paise for INR).
// Everything here uses integer math; division happens only for percentages.

// Number of decimal places the currency uses: INR → 2, JPY → 0.
export function minorUnitDigits(currency) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits;
}

// 123450 → "1234.50" (INR). Built from integer division, never floats.
export function minorToDecimalString(amountMinor, currency) {
  const digits = minorUnitDigits(currency);
  const sign = amountMinor < 0 ? '-' : '';
  const abs = Math.abs(amountMinor);
  if (digits === 0) return `${sign}${abs}`;
  const factor = 10 ** digits;
  return `${sign}${Math.floor(abs / factor)}.${String(abs % factor).padStart(digits, '0')}`;
}

// Percentage rounded to one decimal place, or null when it is undefined
// (dividing by zero), so the UI can show "—" instead of "NaN%" or "Infinity%".
export function percent(part, whole) {
  if (whole === 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

// How much `current` changed compared with `previous`, in percent.
export function percentChange(current, previous) {
  return percent(current - previous, previous);
}
