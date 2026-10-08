import { calendarMonthKey, calendarPeriodBounds, yearPeriodOptions } from '@/lib/metrics-period';
import { describe, expect, it } from 'vitest';

describe('metric calendar periods', () => {
  it('starts a Manila week on Monday even while the UTC date is Sunday', () => {
    const now = new Date('2026-10-04T17:00:00.000Z');
    expect(calendarPeriodBounds('week', now, 'Asia/Manila')).toEqual({
      from: '2026-10-04T16:00:00.000Z',
      until: '2026-10-11T16:00:00.000Z',
    });
  });

  it('keeps month and quarter bounds in the selected product timezone', () => {
    const now = new Date('2026-09-30T17:00:00.000Z');
    expect(calendarMonthKey(now, 'Asia/Manila')).toBe('2026-10');
    expect(calendarPeriodBounds('month', now, 'Asia/Manila')).toEqual({
      from: '2026-09-30T16:00:00.000Z',
      until: '2026-10-31T16:00:00.000Z',
    });
    expect(calendarPeriodBounds('quarter', now, 'Asia/Manila')).toEqual({
      from: '2026-09-30T16:00:00.000Z',
      until: '2026-12-31T16:00:00.000Z',
    });
  });

  it('uses different calendar months for viewers in Rome and Sydney near a boundary', () => {
    const now = new Date('2026-09-30T14:30:00.000Z');
    expect(calendarMonthKey(now, 'Europe/Rome')).toBe('2026-09');
    expect(calendarMonthKey(now, 'Australia/Sydney')).toBe('2026-10');
  });

  it('accounts for daylight-saving changes inside a calendar month', () => {
    const now = new Date('2026-10-15T12:00:00.000Z');
    expect(calendarPeriodBounds('month', now, 'Europe/Rome')).toEqual({
      from: '2026-09-30T22:00:00.000Z',
      until: '2026-10-31T23:00:00.000Z',
    });
    expect(calendarPeriodBounds('month', now, 'Australia/Sydney')).toEqual({
      from: '2026-09-30T14:00:00.000Z',
      until: '2026-10-31T13:00:00.000Z',
    });
  });

  it('preserves UTC grouping boundaries and generates year choices', () => {
    const now = new Date('2026-01-01T00:30:00.000Z');
    expect(calendarPeriodBounds('year', now, 'UTC')).toEqual({
      from: '2026-01-01T00:00:00.000Z',
      until: '2027-01-01T00:00:00.000Z',
    });
    expect(yearPeriodOptions(2024, now, 'UTC').map((option) => option.value)).toEqual([
      'all',
      '2026',
      '2025',
      '2024',
    ]);
  });
});
