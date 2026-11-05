// Amounts are integers in the currency's smallest unit (paise for INR), the
// same as on the server. Text is turned into paise with string math, never
// floats: parseFloat("0.29") * 100 is 28.999999999999996.

export const MAX_AMOUNT_MINOR = 10_000_000_000_000; // matches the server limit

const digitsCache = new Map();

// Number of decimal places the currency uses: INR → 2, JPY → 0.
export function minorUnitDigits(currency) {
  if (!digitsCache.has(currency)) {
    const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits;
    digitsCache.set(currency, digits);
  }
  return digitsCache.get(currency);
}

// 123450 → "1234.50" (INR). Integer division only.
export function minorToDecimalString(amountMinor, currency) {
  const digits = minorUnitDigits(currency);
  const sign = amountMinor < 0 ? '-' : '';
  const abs = Math.abs(amountMinor);
  if (digits === 0) return `${sign}${abs}`;
  const factor = 10 ** digits;
  return `${sign}${Math.floor(abs / factor)}.${String(abs % factor).padStart(digits, '0')}`;
}

// Text for an amount input when editing: 123450 → "1234.5", 120000 → "1200".
export function minorToInputString(amountMinor, currency) {
  const text = minorToDecimalString(amountMinor, currency);
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

// Parses what the user typed into whole paise.
// Returns { minor } on success or { error } with a message to show.
// Accepts "1234", "1,234.50", "1,23,456" and ".5". Commas only count as
// thousands separators: "12,5" is rejected instead of silently becoming 125.
export function parseAmount(input, currency) {
  const digits = minorUnitDigits(currency);
  const text = String(input ?? '').trim();

  if (text === '') return { error: 'Enter an amount.' };
  if (text.startsWith('-')) {
    return { error: 'Enter the amount without a minus sign. Choose Expense or Income instead.' };
  }

  const match = /^(\d{1,3}(?:,\d{2,3})+|\d*)(?:\.(\d*))?$/.exec(text);
  if (!match || (match[1] === '' && !match[2])) {
    return { error: 'Enter a number like 250 or 99.50. Use a dot for decimals.' };
  }

  const whole = match[1].replaceAll(',', '');
  const fraction = match[2] ?? '';
  if (fraction.length > digits) {
    return {
      error: digits === 0 ? `${currency} amounts can't have decimals.` : `Use at most ${digits} decimal places.`,
    };
  }

  // Too many digits can't be represented safely, and are over the limit anyway.
  const wholeDigits = whole.replace(/^0+/, '');
  if (wholeDigits.length > 15) return { error: 'That amount is too large.' };

  const minor = Number(wholeDigits || '0') * 10 ** digits + Number(fraction.padEnd(digits, '0') || '0');
  if (minor <= 0) return { error: 'The amount must be greater than zero.' };
  if (minor > MAX_AMOUNT_MINOR) return { error: 'That amount is too large.' };
  return { minor };
}

// 25000000 → "₹2.5L" (INR uses lakh / crore). For chart axis labels only:
// it rounds, so it must never be used where the exact amount matters.
export function formatMoneyCompact(amountMinor, currency) {
  const key = `${currency}|compact`;
  if (!formatters.has(key)) {
    const locale = currency === 'INR' ? 'en-IN' : undefined;
    formatters.set(
      key,
      new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }),
    );
  }
  return formatters.get(key).format(minorToDecimalString(amountMinor, currency));
}

// Share of a whole as a whole-number percent: (2500, 10000) → 25. null if whole is 0.
export function sharePercent(part, whole) {
  return whole === 0 ? null : Math.round((part * 100) / whole);
}

// "INR" → "₹"
export function currencySymbol(currency) {
  return (
    new Intl.NumberFormat('en-IN', { style: 'currency', currency })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? currency
  );
}

const formatters = new Map();

// 123450 → "₹1,234.50" (Indian digit grouping for INR: ₹12,34,567.00).
// Intl.NumberFormat accepts a decimal string, so no float is involved.
export function formatMoney(amountMinor, currency, { signDisplay = 'auto' } = {}) {
  const key = `${currency}|${signDisplay}`;
  if (!formatters.has(key)) {
    const locale = currency === 'INR' ? 'en-IN' : undefined;
    formatters.set(key, new Intl.NumberFormat(locale, { style: 'currency', currency, signDisplay }));
  }
  return formatters.get(key).format(minorToDecimalString(amountMinor, currency));
}
