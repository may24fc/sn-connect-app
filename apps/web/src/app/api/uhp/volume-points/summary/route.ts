import { UHP_VP_CATEGORY_VALUES } from '@/lib/uhp';
import { type NextRequest, NextResponse } from 'next/server';
import { requireUhpModule } from '../../_lib';

export async function GET(request: NextRequest) {
  const auth = await requireUhpModule('volume_points');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const month = request.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month))
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
  const reportingMonth = `${month}-01`;
  const [entriesResult, targetsResult, overallResult] = await Promise.all([
    auth.context.admin
      .from('uhp_vp_entries')
      .select('category, volume_points, amount, currency')
      .eq('reporting_month', reportingMonth)
      .is('deleted_at', null),
    auth.context.admin
      .from('uhp_vp_month_targets')
      .select('*')
      .eq('reporting_month', reportingMonth),
    auth.context.admin
      .from('uhp_vp_entries')
      .select('reporting_month, volume_points')
      .is('deleted_at', null)
      .order('reporting_month'),
  ]);
  if (entriesResult.error || targetsResult.error || overallResult.error) {
    return NextResponse.json({ error: 'Failed to calculate summary' }, { status: 500 });
  }
  const targetsByCategory = new Map((targetsResult.data ?? []).map((row) => [row.category, row]));
  const categories = UHP_VP_CATEGORY_VALUES.map((category) => {
    const actual = (entriesResult.data ?? [])
      .filter((entry) => entry.category === category)
      .reduce((sum, entry) => sum + Number(entry.volume_points), 0);
    const target = targetsByCategory.get(category);
    const targetVp = Number(target?.target_vp ?? 0);
    const forecastVp = Number(target?.forecast_vp ?? 0);
    return {
      category,
      actualVp: actual,
      targetVp,
      forecastVp,
      targetPercent: targetVp ? Math.round((actual / targetVp) * 1000) / 10 : 0,
      forecastPercent: forecastVp ? Math.round((actual / forecastVp) * 1000) / 10 : 0,
    };
  });
  const overall = new Map<string, number>();
  for (const row of overallResult.data ?? []) {
    overall.set(
      row.reporting_month,
      (overall.get(row.reporting_month) ?? 0) + Number(row.volume_points)
    );
  }
  return NextResponse.json({
    data: {
      reportingMonth,
      categories,
      totalActualVp: categories.reduce((sum, row) => sum + row.actualVp, 0),
      totalTargetVp: categories.reduce((sum, row) => sum + row.targetVp, 0),
      totalForecastVp: categories.reduce((sum, row) => sum + row.forecastVp, 0),
      overall: [...overall.entries()].map(([monthKey, volumePoints]) => ({
        reportingMonth: monthKey,
        volumePoints,
      })),
    },
  });
}
