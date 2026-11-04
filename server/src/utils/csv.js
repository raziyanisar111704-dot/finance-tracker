// Formats one CSV cell (RFC 4180) and defends against "formula injection":
// spreadsheet apps run cells starting with = + - @ as formulas, so a note
// like "=HYPERLINK(...)" is prefixed with ' to keep it plain text.
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

// Rows → CSV text. The leading BOM makes Excel read UTF-8 correctly (₹, Hindi).
export function toCsv(rows) {
  return `﻿${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
