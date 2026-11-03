export interface VolumePointEntryTotal {
  category: string;
  volume_points: number | string;
}

export interface VolumePointMonthlyActual {
  reportingMonth: string;
  volumePoints: number;
  source: 'final' | 'orders';
}

export function volumePointYearMonths(
  year: number,
  actuals: ReadonlyArray<VolumePointMonthlyActual>
) {
  const months = new Map(actuals.map((row) => [row.reportingMonth.slice(0, 7), row]));
  return Array.from({ length: 12 }, (_, index) => {
    const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
    const actual = months.get(monthKey);
    return {
      monthKey,
      month: new Date(`${monthKey}-01T00:00:00Z`).toLocaleDateString('en-US', {
        month: 'short',
        timeZone: 'UTC',
      }),
      volumePoints: actual?.volumePoints ?? null,
      source: actual?.source ?? 'unreported',
    };
  });
}

export interface VolumePointTargetTotal {
  category: string;
  target_vp: number | string | null;
  forecast_vp: number | string | null;
}

export interface VolumePointMonthTarget extends VolumePointTargetTotal {
  reporting_month: string;
}

export interface VolumePointStandardTarget extends VolumePointTargetTotal {
  effective_from: string;
}

export function resolveVolumePointTargets(
  categories: ReadonlyArray<string>,
  fromMonth: string,
  toMonth: string,
  overrides: ReadonlyArray<VolumePointMonthTarget>,
  standards: ReadonlyArray<VolumePointStandardTarget>
) {
  const overrideMap = new Map(
    overrides.map((row) => [`${row.reporting_month.slice(0, 7)}:${row.category}`, row])
  );
  const standardMap = new Map(standards.map((row) => [row.category, row]));
  const targets = [];
  const fromYear = Number(fromMonth.slice(0, 4));
  const fromMonthNumber = Number(fromMonth.slice(5, 7));
  const toYear = Number(toMonth.slice(0, 4));
  const toMonthNumber = Number(toMonth.slice(5, 7));
  for (
    let index = fromYear * 12 + fromMonthNumber - 1;
    index <= toYear * 12 + toMonthNumber - 1;
    index++
  ) {
    const month = `${String(Math.floor(index / 12)).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
    targets.push(
      ...categories.map((category) => {
        const override = overrideMap.get(`${month}:${category}`);
        const standard = standardMap.get(category);
        const applicableStandard =
          standard && standard.effective_from.slice(0, 7) <= month ? standard : undefined;
        const row = override ?? applicableStandard;
        return {
          reporting_month: `${month}-01`,
          category,
          target_vp: Number(row?.target_vp ?? 0),
          forecast_vp: Number(row?.forecast_vp ?? 0),
          source: override ? 'override' : applicableStandard ? 'standard' : 'unset',
        };
      })
    );
  }
  return targets;
}

export function summarizeVolumePointCategories(
  categories: ReadonlyArray<string>,
  entries: ReadonlyArray<VolumePointEntryTotal>,
  targets: ReadonlyArray<VolumePointTargetTotal>
) {
  return categories.map((category) => {
    const actualVp = entries
      .filter((entry) => entry.category === category)
      .reduce((sum, entry) => sum + Number(entry.volume_points), 0);
    const categoryTargets = targets.filter((row) => row.category === category);
    const targetVp = categoryTargets.reduce((sum, row) => sum + Number(row.target_vp ?? 0), 0);
    const forecastVp = categoryTargets.reduce((sum, row) => sum + Number(row.forecast_vp ?? 0), 0);
    return {
      category,
      actualVp,
      targetVp,
      forecastVp,
      targetPercent: targetVp ? Math.round((actualVp / targetVp) * 1000) / 10 : 0,
      forecastPercent: forecastVp ? Math.round((actualVp / forecastVp) * 1000) / 10 : 0,
    };
  });
}
