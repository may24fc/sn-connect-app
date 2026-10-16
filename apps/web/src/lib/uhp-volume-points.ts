export interface VolumePointEntryTotal {
  category: string;
  volume_points: number | string;
}

export interface VolumePointTargetTotal {
  category: string;
  target_vp: number | string | null;
  forecast_vp: number | string | null;
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
