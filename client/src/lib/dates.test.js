import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDays, addMonths, datePresets, formatDayHeading, formatMonthShort, monthBounds, todayIn } from './dates.js';

describe('todayIn', () => {
  afterEach(() => vi.useRealTimers());

  it("uses the user's time zone, not the device's", () => {
    // 31 Oct 2026, 20:00 UTC is already 1 Nov 01:30 in India.
    vi.useFakeTimers({ now: new Date('2026-10-31T20:00:00Z') });
    expect(todayIn('Asia/Kolkata')).toBe('2026-11-01');
    expect(todayIn('America/New_York')).toBe('2026-10-31');
  });
});

describe('calendar maths', () => {
  it('knows month lengths, including leap years', () => {
    expect(monthBounds('2026-02-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(monthBounds('2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthBounds('2026-01-15', -1)).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('moves across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
  });

  it('builds filter presets from today', () => {
    const presets = Object.fromEntries(datePresets('2026-03-05').map((p) => [p.value, [p.from, p.to]]));
    expect(presets).toEqual({
      'this-month': ['2026-03-01', '2026-03-31'],
      'last-month': ['2026-02-01', '2026-02-28'],
      'last-30-days': ['2026-02-04', '2026-03-05'], // 30 days including today
      'this-year': ['2026-01-01', '2026-12-31'],
    });
  });
});

describe('labels', () => {
  it('says Today and Yesterday, otherwise the full date', () => {
    expect(formatDayHeading('2026-11-05', '2026-11-05')).toBe('Today');
    expect(formatDayHeading('2026-11-04', '2026-11-05')).toBe('Yesterday');
    // Browsers print "Sun 25 Oct 2026"; Node's date data adds a comma.
    expect(formatDayHeading('2026-10-25', '2026-11-05')).toMatch(/^Sun,? 25 Oct 2026$/);
  });

  it('uses "Sep", never "Sept"', () => {
    expect(formatMonthShort('2026-09')).toBe('Sep');
  });
});
