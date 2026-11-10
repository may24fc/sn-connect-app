import { describe, expect, it } from 'vitest';
import {
  recognitionMondayForDate,
  recognitionPeriodForMonday,
} from '../../apps/web/src/lib/recognition';

describe('recognitionPeriodForMonday', () => {
  it('uses the previous Manila calendar week on an ordinary Monday', () => {
    expect(recognitionPeriodForMonday('2026-10-12')).toEqual({
      periodType: 'weekly',
      periodStart: '2026-10-05',
      periodEnd: '2026-10-11',
    });
  });

  it('replaces the weekly period with the closed month on the first Monday', () => {
    expect(recognitionPeriodForMonday('2026-11-02')).toEqual({
      periodType: 'monthly',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
    });
  });

  it('handles year boundaries for the first Monday', () => {
    expect(recognitionPeriodForMonday('2027-01-04')).toEqual({
      periodType: 'monthly',
      periodStart: '2026-12-01',
      periodEnd: '2026-12-31',
    });
  });

  it('rejects non-Monday generation dates', () => {
    expect(() => recognitionPeriodForMonday('2026-10-24')).toThrow('Monday');
  });
});

describe('recognitionMondayForDate', () => {
  it('keeps a Monday unchanged', () => {
    expect(recognitionMondayForDate('2026-11-09')).toBe('2026-11-09');
  });

  it('resolves a Tuesday to the current Manila week Monday', () => {
    expect(recognitionMondayForDate('2026-11-10')).toBe('2026-11-09');
  });

  it('resolves a Sunday to the preceding Monday', () => {
    expect(recognitionMondayForDate('2026-11-15')).toBe('2026-11-09');
  });
});
