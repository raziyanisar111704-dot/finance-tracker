import { describe, expect, it } from 'vitest';
import { budgetStatus } from '../src/services/budgets.service.js';
import { csvCell, toCsv } from '../src/utils/csv.js';
import { addMonths, isValidDateString, monthRange, monthsBetween, todayIn } from '../src/utils/dates.js';
import { minorToDecimalString, percent, percentChange } from '../src/utils/money.js';

describe('dates', () => {
  it('knows the real length of every month, including leap years', () => {
    expect(monthRange('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(monthRange('2026-04').to).toBe('2026-04-30');
    expect(monthRange('2026-12').to).toBe('2026-12-31');
  });

  it('moves across year boundaries', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(monthsBetween('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
  });

  it("uses the user's time zone to decide what 'today' is", () => {
    // 19:00 UTC on 31 Oct = 00:30 IST on 1 Nov
    const instant = new Date('2026-10-31T19:00:00Z');
    expect(todayIn('Asia/Kolkata', instant)).toBe('2026-11-01');
    expect(todayIn('UTC', instant)).toBe('2026-10-31');
  });

  it('rejects impossible dates', () => {
    expect(isValidDateString('2024-02-29')).toBe(true);
    expect(isValidDateString('2026-02-29')).toBe(false);
    expect(isValidDateString('2026-04-31')).toBe(false);
  });
});

describe('money', () => {
  it('formats minor units without floating-point errors', () => {
    expect(minorToDecimalString(123450, 'INR')).toBe('1234.50');
    expect(minorToDecimalString(5, 'INR')).toBe('0.05');
    expect(minorToDecimalString(0, 'INR')).toBe('0.00');
    expect(minorToDecimalString(-99999, 'INR')).toBe('-999.99');
    expect(minorToDecimalString(1500, 'JPY')).toBe('1500');
  });

  it('returns null instead of dividing by zero', () => {
    expect(percent(1, 3)).toBe(33.3);
    expect(percent(5, 0)).toBeNull();
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(50, 0)).toBeNull();
  });
});

describe('budgetStatus', () => {
  it('warns from exactly 80% and only exceeds above 100%', () => {
    expect(budgetStatus(79999, 100000)).toBe('ok');
    expect(budgetStatus(80000, 100000)).toBe('warning');
    expect(budgetStatus(100000, 100000)).toBe('warning');
    expect(budgetStatus(100001, 100000)).toBe('exceeded');
    expect(budgetStatus(0, 100000)).toBe('ok');
  });
});

describe('csv', () => {
  it('escapes commas, quotes and new lines', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell('+91 98765')).toBe("'+91 98765");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('starts with a UTF-8 BOM and uses CRLF line endings', () => {
    expect(toCsv([['a', 'b'], ['1', '₹']])).toBe('﻿a,b\r\n1,₹\r\n');
  });
});
