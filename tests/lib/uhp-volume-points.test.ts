import {
  resolveVolumePointTargets,
  summarizeVolumePointCategories,
  volumePointYearMonths,
} from '@/lib/uhp-volume-points';
import { describe, expect, it } from 'vitest';

describe('Volume Points range summary', () => {
  it('returns all twelve months, preserving explicit zero versus unreported values', () => {
    const months = volumePointYearMonths(2026, [
      { reportingMonth: '2026-01-01', volumePoints: 1319.1, source: 'final' },
      { reportingMonth: '2026-11-01', volumePoints: 0, source: 'orders' },
      { reportingMonth: '2025-01-01', volumePoints: 123, source: 'orders' },
    ]);
    expect(months).toHaveLength(12);
    expect(months[0]).toMatchObject({ month: 'Jan', volumePoints: 1319.1, source: 'final' });
    expect(months[10]).toMatchObject({ month: 'Nov', volumePoints: 0, source: 'orders' });
    expect(months[11]).toMatchObject({ month: 'Dec', volumePoints: null, source: 'unreported' });
    expect(months[1]).toMatchObject({ month: 'Feb', volumePoints: null, source: 'unreported' });
  });

  const standards = [
    { category: 'personal', effective_from: '2026-11-01', target_vp: 500, forecast_vp: 400 },
    {
      category: 'repeat_customer',
      effective_from: '2026-11-01',
      target_vp: 1500,
      forecast_vp: 900,
    },
  ];

  it('uses November standards for December and subsequent years without creating overrides', () => {
    const overrides: Array<{
      reporting_month: string;
      category: string;
      target_vp: number;
      forecast_vp: number;
    }> = [];
    const targets = resolveVolumePointTargets(
      ['personal'],
      '2026-12',
      '2027-01',
      overrides,
      standards
    );
    expect(targets.map((row) => [row.reporting_month, row.target_vp, row.source])).toEqual([
      ['2026-12-01', 500, 'standard'],
      ['2027-01-01', 500, 'standard'],
    ]);
    expect(overrides).toEqual([]);
  });

  it('preserves saved values, including explicit zeros, while resolving missing categories', () => {
    const targets = resolveVolumePointTargets(
      ['personal', 'repeat_customer'],
      '2026-11',
      '2026-12',
      [{ reporting_month: '2026-11-01', category: 'personal', target_vp: 0, forecast_vp: 0 }],
      standards
    );
    expect(targets.map((row) => [row.target_vp, row.source])).toEqual([
      [0, 'override'],
      [1500, 'standard'],
      [500, 'standard'],
      [1500, 'standard'],
    ]);
  });

  it('does not apply standards to months before their effective date', () => {
    expect(resolveVolumePointTargets(['personal'], '2026-10', '2026-10', [], standards)).toEqual([
      {
        reporting_month: '2026-10-01',
        category: 'personal',
        target_vp: 0,
        forecast_vp: 0,
        source: 'unset',
      },
    ]);
  });

  it('sums a quarter with historical, overridden, and inherited months', () => {
    const resolved = resolveVolumePointTargets(
      ['personal'],
      '2026-10',
      '2026-12',
      [{ reporting_month: '2026-11-01', category: 'personal', target_vp: 100, forecast_vp: 50 }],
      standards
    );
    expect(summarizeVolumePointCategories(['personal'], [], resolved)[0]).toMatchObject({
      targetVp: 600,
      forecastVp: 450,
    });
  });

  it('reverts to standards after removing an override and respects edited standards', () => {
    const editedStandards = [{ ...standards[0], target_vp: 600 }];
    expect(
      resolveVolumePointTargets(['personal'], '2026-12', '2026-12', [], editedStandards)[0]
    ).toMatchObject({ target_vp: 600, source: 'standard' });
    expect(
      resolveVolumePointTargets(
        ['personal'],
        '2026-11',
        '2026-11',
        [{ reporting_month: '2026-11-01', category: 'personal', target_vp: 500, forecast_vp: 400 }],
        editedStandards
      )[0]
    ).toMatchObject({ target_vp: 500, source: 'override' });
  });

  it('supports an empty setup and the final supported calendar month', () => {
    expect(resolveVolumePointTargets(['personal'], '9999-12', '9999-12', [], [])).toHaveLength(1);
    expect(resolveVolumePointTargets(['personal'], '2026-12', '2026-12', [], [])[0]).toMatchObject({
      target_vp: 0,
      forecast_vp: 0,
      source: 'unset',
    });
  });

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
