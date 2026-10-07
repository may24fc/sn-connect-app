import { describe, expect, it } from 'vitest';
import { computeRevenueForecast } from '@/lib/revenue-forecast';

describe('SFO revenue forecast records', () => {
  it('compares records only with earlier live months and leaves missing months unearned', () => {
    const forecast = computeRevenueForecast([
      { id: 'old-jan', year: 2025, month: 1, actualRevenueAud: 100 },
      { id: 'old-feb', year: 2025, month: 2, actualRevenueAud: 150 },
      { id: 'new-jan', year: 2026, month: 1, actualRevenueAud: 120 },
      { id: 'new-feb', year: 2026, month: 2, actualRevenueAud: 200 },
    ], 2026, 'average');

    expect(forecast.rows[0]?.recordTag).toBe('monthly');
    expect(forecast.rows[1]?.recordTag).toBe('all-time');
    expect(forecast.rows[2]?.targetYearActual).toBeNull();
    expect(forecast.earnedJanToDateAud).toBe(320);
  });
});
