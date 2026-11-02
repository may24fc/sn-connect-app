import { describe, expect, it } from 'vitest';
import { recognitionPeriodForMonday } from '../../apps/web/src/lib/recognition';

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
