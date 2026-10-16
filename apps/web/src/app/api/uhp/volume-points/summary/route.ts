import { UHP_VP_CATEGORY_VALUES } from '@/lib/uhp';
import { summarizeVolumePointCategories } from '@/lib/uhp-volume-points';
import { type NextRequest, NextResponse } from 'next/server';
import { requireUhpModule } from '../../_lib';

export async function GET(request: NextRequest) {
  const auth = await requireUhpModule('volume_points');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const fallbackMonth = new Date().toISOString().slice(0, 7);
  const fromMonth =
    request.nextUrl.searchParams.get('fromMonth') ??
    request.nextUrl.searchParams.get('month') ??
    fallbackMonth;
  const toMonth = request.nextUrl.searchParams.get('toMonth') ?? fromMonth;
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!(validMonth.test(fromMonth) && validMonth.test(toMonth)) || fromMonth > toMonth) {
    return NextResponse.json({ error: 'Invalid month range' }, { status: 400 });
  }
  const fromReportingMonth = `${fromMonth}-01`;
  const toReportingMonth = `${toMonth}-01`;
  const [entriesResult, targetsResult, overallResult] = await Promise.all([
    auth.context.admin
      .from('uhp_vp_entries')
      .select('category, volume_points, amount, currency')
      .gte('reporting_month', fromReportingMonth)
      .lte('reporting_month', toReportingMonth)
      .is('deleted_at', null),
    auth.context.admin
      .from('uhp_vp_month_targets')
      .select('*')
      .gte('reporting_month', fromReportingMonth)
      .lte('reporting_month', toReportingMonth),
    auth.context.admin
      .from('uhp_vp_entries')
      .select('reporting_month, volume_points')
      .is('deleted_at', null)
      .order('reporting_month'),
  ]);
  if (entriesResult.error || targetsResult.error || overallResult.error) {
    return NextResponse.json({ error: 'Failed to calculate summary' }, { status: 500 });
  }
  const categories = summarizeVolumePointCategories(
    UHP_VP_CATEGORY_VALUES,
    entriesResult.data ?? [],
    targetsResult.data ?? []
  );
  const overall = new Map<string, number>();
  for (const row of overallResult.data ?? []) {
    overall.set(
      row.reporting_month,
      (overall.get(row.reporting_month) ?? 0) + Number(row.volume_points)
    );
  }
  return NextResponse.json({
    data: {
      reportingMonth: fromReportingMonth,
      fromMonth,
      toMonth,
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
