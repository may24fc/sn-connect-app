import {
  calendarDateRangeBounds,
  calendarMonthKey,
  calendarPeriodBounds,
  calendarQuarterKeyFromMonth,
  calendarQuarterMonthRange,
  calendarQuarterOptions,
  previousCalendarPeriodBounds,
  yearPeriodOptions,
} from '@/lib/metrics-period';
import { describe, expect, it } from 'vitest';

describe('metric calendar periods', () => {
  it('maps quarters to inclusive reporting-month ranges', () => {
    expect(calendarQuarterKeyFromMonth('2026-10')).toBe('2026-Q4');
    expect(calendarQuarterMonthRange('2026-Q4')).toEqual({
      fromMonth: '2026-10',
      toMonth: '2026-12',
    });
    expect(calendarQuarterOptions('2026-10', 1)).toEqual([
      { value: '2026-Q4', label: 'Q4 2026 (Oct–Dec)' },
      { value: '2026-Q3', label: 'Q3 2026 (Jul–Sep)' },
      { value: '2026-Q2', label: 'Q2 2026 (Apr–Jun)' },
      { value: '2026-Q1', label: 'Q1 2026 (Jan–Mar)' },
    ]);
  });

  it('converts an inclusive custom date range using viewer-local boundaries', () => {
    expect(calendarDateRangeBounds('2026-10-05', '2026-10-12', 'Asia/Manila')).toEqual({
      from: '2026-10-04T16:00:00.000Z',
      until: '2026-10-12T16:00:00.000Z',
    });
    expect(calendarDateRangeBounds('2026-10-24', '2026-10-26', 'Europe/Rome')).toEqual({
      from: '2026-10-23T22:00:00.000Z',
      until: '2026-10-26T23:00:00.000Z',
    });
  });

  it('rejects reversed or invalid custom dates', () => {
    expect(() => calendarDateRangeBounds('2026-10-13', '2026-10-12', 'UTC')).toThrow(
      'Start date must not be after end date.'
    );
    expect(() => calendarDateRangeBounds('2026-02-30', '2026-03-01', 'UTC')).toThrow(
      'Date is not a valid calendar day.'
    );
  });

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

  it('selects the full previous local week across Italy and Australia DST transitions', () => {
    expect(
      previousCalendarPeriodBounds('week', new Date('2026-10-26T12:00:00Z'), 'Europe/Rome')
    ).toEqual({
      from: '2026-10-18T22:00:00.000Z',
      until: '2026-10-25T23:00:00.000Z',
    });
    expect(
      previousCalendarPeriodBounds('week', new Date('2026-10-05T12:00:00Z'), 'Australia/Sydney')
    ).toEqual({
      from: '2026-09-27T14:00:00.000Z',
      until: '2026-10-04T13:00:00.000Z',
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
