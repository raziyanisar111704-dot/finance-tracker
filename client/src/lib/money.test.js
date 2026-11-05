import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  formatMoneyCompact,
  minorToInputString,
  parseAmount,
  parseSignedAmount,
  sharePercent,
} from './money.js';

// Every amount a user types goes through these functions before it reaches
// the server, so a mistake here would save wrong amounts.
describe('parseAmount', () => {
  it.each([
    ['0.29', 29], // parseFloat('0.29') * 100 would give 28.999…
    ['1234', 123400],
    ['1,234.50', 123450],
    ['1,23,456.78', 12345678], // Indian grouping
    ['.5', 50],
    ['10.', 1000],
    ['0.01', 1],
    ['  42 ', 4200],
    ['100000000000', 10_000_000_000_000], // the maximum
  ])('reads %j as %i paise', (input, minor) => {
    expect(parseAmount(input, 'INR')).toEqual({ minor });
  });

  it.each([
    ['12,5', 'Use a dot'], // a comma is never a decimal point
    ['1,2,3', 'Use a dot'],
    ['1.234', 'at most 2 decimal places'],
    ['-5', 'without a minus sign'],
    ['0', 'greater than zero'],
    ['0.00', 'greater than zero'],
    ['abc', 'Use a dot'],
    ['1e5', 'Use a dot'],
    ['', 'Enter an amount'],
    ['.', 'Use a dot'],
    ['100000000000.01', 'too large'],
    ['9999999999999999', 'too large'],
  ])('rejects %j', (input, message) => {
    expect(parseAmount(input, 'INR').error).toContain(message);
  });

  it("follows the currency's decimal places", () => {
    expect(parseAmount('500', 'JPY')).toEqual({ minor: 500 });
    expect(parseAmount('5.5', 'JPY').error).toContain("can't have decimals");
    expect(parseAmount('1.005', 'KWD')).toEqual({ minor: 1005 });
  });
});

describe('parseSignedAmount (opening balance)', () => {
  it.each([
    ['', 0],
    ['0', 0],
    ['-0', 0],
    ['0.00', 0],
    ['1500.50', 150050],
    ['-1,500.50', -150050],
    [' - 25 ', -2500],
  ])('reads %j as %i paise', (input, minor) => {
    expect(parseSignedAmount(input, 'INR')).toEqual({ minor });
  });

  it.each(['12,5', '--5', 'abc', '-1.234'])('rejects %j', (input) => {
    expect(parseSignedAmount(input, 'INR').error).toBeDefined();
  });
});

describe('formatting', () => {
  it('uses Indian grouping for rupees and exact paise', () => {
    expect(formatMoney(123456789, 'INR')).toBe('₹12,34,567.89');
    expect(formatMoney(-29, 'INR')).toBe('-₹0.29');
    expect(formatMoney(150000, 'INR', { signDisplay: 'exceptZero' })).toBe('+₹1,500.00');
    expect(formatMoney(0, 'INR', { signDisplay: 'exceptZero' })).toBe('₹0.00');
    expect(formatMoney(1234, 'USD')).toBe('$12.34');
  });

  it('stays exact for the largest amounts (no floating point)', () => {
    expect(formatMoney(10_000_000_000_001, 'INR')).toBe('₹1,00,00,00,00,000.01');
  });

  it('round-trips amounts into the edit field', () => {
    expect(minorToInputString(123450, 'INR')).toBe('1234.5');
    expect(minorToInputString(120000, 'INR')).toBe('1200');
    expect(minorToInputString(5, 'INR')).toBe('0.05');
    for (const minor of [1, 29, 123450, 99999999]) {
      expect(parseAmount(minorToInputString(minor, 'INR'), 'INR')).toEqual({ minor });
    }
  });

  it('shortens chart labels with lakh and crore', () => {
    expect(formatMoneyCompact(25_000_000, 'INR')).toBe('₹2.5L');
    expect(formatMoneyCompact(1_000_000_000, 'INR')).toBe('₹1Cr');
  });

  it('gives whole-number shares and no division by zero', () => {
    expect(sharePercent(2500, 10000)).toBe(25);
    expect(sharePercent(1, 3)).toBe(33);
    expect(sharePercent(5, 0)).toBeNull();
  });
});
