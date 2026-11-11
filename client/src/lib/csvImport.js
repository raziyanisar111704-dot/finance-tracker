// Reading CSV files for "Import transactions". Everything here runs in the
// browser: the raw file never leaves the device, only the rows the user ticks.
import { parseAmount } from './money.js';

export const MAX_IMPORT_ROWS = 2000; // same as the server
export const MAX_FILE_BYTES = 1024 * 1024; // 1 MB
const MAX_NOTES = 500;

// ---------------------------------------------------------------------------
// 1. CSV text → rows of cells (RFC 4180)
// ---------------------------------------------------------------------------

// Excel in many countries saves with ";" and some banks use tabs. The
// separator is whichever of , ; tab appears most in the first lines,
// counting only characters outside quotes.
export function detectDelimiter(text) {
  const sample = text.slice(0, 5000);
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (const char of sample) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char in counts) counts[char] += 1;
  }
  const [best, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return count > 0 ? best : ',';
}

// Returns an array of rows, each an array of trimmed cell strings. Handles
// quoted cells with commas, doubled quotes ("") and line breaks inside them,
// \r\n or \n line endings, and Excel's invisible BOM at the start.
// Blank lines are skipped, so each row also carries `row.line`: its line
// number in the file, as a text editor or spreadsheet would show it.
export function parseCsv(input, delimiter = detectDelimiter(input)) {
  const text = input.replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  let line = 1; // line we're on
  let rowLine = 1; // line the current row started on

  const endCell = () => {
    row.push(cell.trim());
    cell = '';
  };
  const endRow = () => {
    endCell();
    if (row.some((value) => value !== '')) {
      row.line = rowLine;
      rows.push(row);
    }
    row = [];
    line += 1;
    rowLine = line;
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        // A line break inside a quoted cell still moves to the next line.
        if (char === '\n' || (char === '\r' && text[i + 1] !== '\n')) line += 1;
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      endCell();
    } else if (char === '\r' && text[i + 1] === '\n') {
      endRow();
      i += 1;
    } else if (char === '\n' || char === '\r') {
      endRow();
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) endRow();
  return rows;
}

// ---------------------------------------------------------------------------
// 2. Which column is which
// ---------------------------------------------------------------------------

export const FIELDS = [
  { key: 'date', label: 'Date', required: true },
  { key: 'description', label: 'Description / notes' },
  { key: 'amount', label: 'Amount (one column)' },
  { key: 'debit', label: 'Debit / withdrawal (money out)' },
  { key: 'credit', label: 'Credit / deposit (money in)' },
  { key: 'type', label: 'Type (income / expense, Dr / Cr)' },
  { key: 'category', label: 'Category' },
  { key: 'paymentMethod', label: 'Payment method' },
];

// Header words used by this app's export and by common Indian bank exports.
// Earlier patterns win: "Txn Date" is preferred over "Value Date".
const HEADER_PATTERNS = {
  date: [/^(txn|tran|transaction|posting)\.? ?date/, /^date$/, /date/],
  description: [/^(notes?|description|narration|particulars|details|remarks)/, /description|narration|particulars|remarks/],
  amount: [/^amount$/, /^(txn |transaction )?amount( ?\(.*\))?$/, /^amt$/],
  debit: [/withdrawal|debit|^dr\.?( amount)?$|money out|paid out/],
  credit: [/deposit|credit|^cr\.?( amount)?$|money in|paid in/],
  type: [/^type$/, /^(dr|cr) ?\/ ?(cr|dr)$/, /^(txn |transaction )?type$/],
  category: [/^category$/, /category/],
  paymentMethod: [/^payment[ _]?method$/, /^(payment )?mode$/],
};

const normaliseHeader = (header) => header.toLowerCase().replace(/\s+/g, ' ').trim();

// headers → { date: 0, description: 6, amount: 3, … } (column indexes, or -1).
export function guessMapping(headers) {
  const names = headers.map(normaliseHeader);
  const used = new Set();
  const mapping = {};
  for (const { key } of FIELDS) {
    mapping[key] = -1;
    for (const pattern of HEADER_PATTERNS[key]) {
      const index = names.findIndex((name, i) => !used.has(i) && pattern.test(name));
      if (index !== -1) {
        mapping[key] = index;
        used.add(index);
        break;
      }
    }
  }
  // "Amount" plus Debit/Credit columns: the bank layout wins.
  if (mapping.debit !== -1 && mapping.credit !== -1) mapping.amount = -1;
  return mapping;
}

// Bank statements often start with a few lines of account details. The
// header is the first row (within the first 30) that has a date column and
// some amount column.
export function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 30); i += 1) {
    const m = guessMapping(rows[i]);
    if (m.date !== -1 && (m.amount !== -1 || m.debit !== -1 || m.credit !== -1)) return i;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// 3. Dates
// ---------------------------------------------------------------------------

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function isRealDate(year, month, day) {
  if (year < 1970 || year > 2100 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const pad = (n) => String(n).padStart(2, '0');
const fullYear = (y) => (y.length === 2 ? 2000 + Number(y) : Number(y));

// "05/11/2026", "5-11-26", "2026-11-05", "05-Nov-2026", "5 Nov 2026",
// "2026-11-05 10:30:00" → "2026-11-05". `order` decides what 05/11 means:
// 'dmy' (India, UK: 5 November) or 'mdy' (US: May 11). Returns null if it
// isn't a real date.
export function parseImportDate(input, order = 'dmy') {
  const text = String(input ?? '').trim().replace(/[ T]\d{1,2}:\d{2}(:\d{2})?( ?[ap]m)?$/i, '');
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return isRealDate(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(text);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    const [d, mo] = order === 'mdy' ? [b, a] : [a, b];
    const y = fullYear(m[3]);
    return isRealDate(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  m = /^(\d{1,2})[-/ ]([a-z]{3})[a-z]*[-/ ,]+(\d{2}|\d{4})$/i.exec(text);
  if (m) {
    const mo = MONTHS.indexOf(m[2].toLowerCase()) + 1;
    const [d, y] = [Number(m[1]), fullYear(m[3])];
    return mo > 0 && isRealDate(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  return null;
}

// Looks at all the dates in a column: "13/05/2026" can only be day-first,
// "05/13/2026" only month-first. Returns 'dmy', 'mdy' or null (can't tell).
export function detectDateOrder(values) {
  let dmy = false;
  let mdy = false;
  for (const value of values) {
    const m = /^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/.exec(String(value).trim());
    if (!m) continue;
    if (Number(m[1]) > 12) dmy = true;
    if (Number(m[2]) > 12) mdy = true;
  }
  if (dmy && !mdy) return 'dmy';
  if (mdy && !dmy) return 'mdy';
  return null;
}

// ---------------------------------------------------------------------------
// 4. Amounts
// ---------------------------------------------------------------------------

// Bank amount text → { minor, sign } where sign is -1 (money out), 1 (money
// in) or 0 (not stated). Accepts "₹1,23,456.78", "Rs. 500", "INR 500",
// "-250.00", "(1,200.00)", "1,200.00 Dr", "500 CR", "+500". Returns
// { empty: true } for a blank cell and { error } for anything else.
export function parseImportAmount(input, currency) {
  let text = String(input ?? '').trim();
  if (text === '' || text === '-') return { empty: true };
  let sign = 0;

  const suffix = /\s*(dr|cr)\.?$/i.exec(text);
  if (suffix) {
    sign = suffix[1].toLowerCase() === 'dr' ? -1 : 1;
    text = text.slice(0, suffix.index);
  }
  text = text.replace(/₹|\brs\.?|\binr\b|\s/gi, '');
  if (/^\(.*\)$/.test(text)) {
    sign = -1;
    text = text.slice(1, -1);
  }
  if (text.startsWith('-')) {
    sign = -1;
    text = text.slice(1);
  } else if (text.startsWith('+')) {
    sign = 1;
    text = text.slice(1);
  }
  // Banks fill the unused Debit or Credit cell with 0.00.
  if (/^0*(\.0*)?$/.test(text.replaceAll(',', ''))) return { empty: true };

  const result = parseAmount(text, currency);
  if (result.error) return { error: `"${String(input).trim()}" isn't an amount we can read.` };
  return { minor: result.minor, sign };
}

// ---------------------------------------------------------------------------
// 5. Cells → transactions
// ---------------------------------------------------------------------------

function typeFromText(text) {
  const value = String(text ?? '').trim().toLowerCase();
  if (/^(income|credit|cr|deposit|in)\.?$/.test(value)) return 'income';
  if (/^(expense|debit|dr|withdrawal|out)\.?$/.test(value)) return 'expense';
  return null;
}

const METHOD_WORDS = [
  [/^upi$/, 'upi'],
  [/^cash$/, 'cash'],
  [/^debit[ _]?card$/, 'debit_card'],
  [/^credit[ _]?card$/, 'credit_card'],
  [/^(bank[ _]?transfer|neft|imps|rtgs|net ?banking)$/, 'bank_transfer'],
  [/^wallet$/, 'wallet'],
  [/^other$/, 'other'],
];

// From a "payment method" cell, or else guessed from a bank description such
// as "UPI/DR/123456/…" or "NEFT-HDFC…".
export function paymentMethodFrom(cell, description) {
  const value = String(cell ?? '').trim().toLowerCase();
  for (const [pattern, method] of METHOD_WORDS) if (pattern.test(value)) return method;
  const text = String(description ?? '').toUpperCase();
  if (/^UPI\b|\bUPI[/-]/.test(text)) return 'upi';
  if (/^(NEFT|IMPS|RTGS)\b|\b(NEFT|IMPS|RTGS)[/-]/.test(text)) return 'bank_transfer';
  if (/^ATM\b|\bATM[ /-]?(WDL|CASH)/.test(text)) return 'cash';
  return 'other';
}

// This app's export protects cells like "=SUM(…)" with a leading ' so
// spreadsheets don't run them; take it off again on the way back in.
export function cleanNotes(text) {
  const value = String(text ?? '').trim();
  return (/^'[=+\-@]/.test(value) ? value.slice(1) : value).slice(0, MAX_NOTES);
}

// rows: data rows (header removed). Returns one entry per row:
//   { line, date, type, amountMinor, notes, categoryName, paymentMethod, error?, skip? }
// `line` is the row number as seen in a spreadsheet (header = headerLine).
// `skip` marks rows with no amount at all (e.g. "Opening balance").
// positiveIs: what a plain amount with no sign or type means.
export function buildRows(rows, mapping, { currency, dateOrder = 'dmy', positiveIs = 'expense', headerLine = 1 }) {
  const cell = (row, key) => (mapping[key] >= 0 ? (row[mapping[key]] ?? '') : '');

  return rows.map((row, i) => {
    const line = row.line ?? headerLine + 1 + i;
    const notes = cleanNotes(cell(row, 'description'));
    const base = { line, notes, categoryName: cell(row, 'category').trim() };
    const fail = (error) => ({ ...base, error });

    // Amount and type
    let amountMinor;
    let type;
    if (mapping.debit >= 0 || mapping.credit >= 0) {
      const debit = parseImportAmount(cell(row, 'debit'), currency);
      const credit = parseImportAmount(cell(row, 'credit'), currency);
      if (debit.error) return fail(debit.error);
      if (credit.error) return fail(credit.error);
      const hasDebit = !debit.empty && debit.minor > 0;
      const hasCredit = !credit.empty && credit.minor > 0;
      if (!hasDebit && !hasCredit) return { ...base, skip: 'No amount on this row.' };
      if (hasDebit && hasCredit) return fail('Both a debit and a credit amount; expected only one.');
      [amountMinor, type] = hasDebit ? [debit.minor, 'expense'] : [credit.minor, 'income'];
    } else if (mapping.amount >= 0) {
      const amount = parseImportAmount(cell(row, 'amount'), currency);
      if (amount.error) return fail(amount.error);
      if (amount.empty) return { ...base, skip: 'No amount on this row.' };
      amountMinor = amount.minor;
      const stated = mapping.type >= 0 ? typeFromText(cell(row, 'type')) : null;
      if (mapping.type >= 0 && cell(row, 'type').trim() !== '' && !stated) {
        return fail(`Type "${cell(row, 'type').trim()}" should be income or expense (or Cr / Dr).`);
      }
      if (stated) type = stated;
      else if (amount.sign !== 0) type = amount.sign < 0 ? 'expense' : 'income';
      else type = positiveIs;
    } else {
      return fail('Choose which column holds the amount.');
    }

    // Date
    const rawDate = cell(row, 'date').trim();
    if (rawDate === '') return fail('The date is missing.');
    const date = parseImportDate(rawDate, dateOrder);
    if (!date) return fail(`"${rawDate}" isn't a real date.`);

    return {
      ...base,
      date,
      type,
      amountMinor,
      paymentMethod: paymentMethodFrom(cell(row, 'paymentMethod'), notes),
    };
  });
}

// Finds the user's category for a name in the file: same type, not
// archived, ignoring capitals and extra spaces. null if there's none.
export function matchCategory(categories, name, type) {
  const wanted = String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!wanted) return null;
  return (
    categories.find((c) => !c.archived && c.type === type && c.name.toLowerCase().replace(/\s+/g, ' ') === wanted) ??
    null
  );
}
