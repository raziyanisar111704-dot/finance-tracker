import { describe, expect, it } from 'vitest';
import { budgetMessage, usedPercent } from './BudgetMeter.jsx';

describe('budget messages', () => {
  it('rounds the percentage down, so "80%" appears exactly when the warning starts', () => {
    expect(usedPercent(7996, 10000)).toBe(79); // 79.96%: still "ok" on the server
    expect(usedPercent(8000, 10000)).toBe(80);
    expect(usedPercent(700000, 800000)).toBe(87);
  });

  it('describes each state in words', () => {
    const at = (spentMinor, limitMinor, status) =>
      budgetMessage({ spentMinor, limitMinor, remainingMinor: limitMinor - spentMinor, status }, 'INR');
    expect(at(1500000, 2000000, 'ok')).toBe('75% used, ₹5,000.00 left');
    expect(at(700000, 800000, 'warning')).toBe('87% used, ₹1,000.00 left');
    expect(at(800000, 800000, 'warning')).toBe('100% used, nothing left');
    expect(at(300000, 250000, 'exceeded')).toBe('₹500.00 over budget');
  });
});
