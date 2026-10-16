import { summarizeVolumePointCategories } from '@/lib/uhp-volume-points';
import { describe, expect, it } from 'vitest';

describe('Volume Points range summary', () => {
  it('aggregates entries, monthly targets, and forecasts across a quarter', () => {
    expect(
      summarizeVolumePointCategories(
        ['personal', 'repeat_customers'],
        [
          { category: 'repeat_customers', volume_points: 40 },
          { category: 'repeat_customers', volume_points: '60' },
        ],
        [
          { category: 'repeat_customers', target_vp: 100, forecast_vp: 80 },
          { category: 'repeat_customers', target_vp: 100, forecast_vp: 120 },
          { category: 'repeat_customers', target_vp: 200, forecast_vp: 200 },
        ]
      )
    ).toEqual([
      {
        category: 'personal',
        actualVp: 0,
        targetVp: 0,
        forecastVp: 0,
        targetPercent: 0,
        forecastPercent: 0,
      },
      {
        category: 'repeat_customers',
        actualVp: 100,
        targetVp: 400,
        forecastVp: 400,
        targetPercent: 25,
        forecastPercent: 25,
      },
    ]);
  });
});
