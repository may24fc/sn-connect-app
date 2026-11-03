import { UHP_VP_CATEGORY_VALUES } from '@/lib/uhp';
import { resolveVolumePointTargets, summarizeVolumePointCategories } from '@/lib/uhp-volume-points';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUhpModule } from '../../_lib';

const monthlyActualsSchema = z.array(
  z.object({
    reporting_month: z.string(),
    volume_points: z.number().nonnegative(),
    source: z.enum(['final', 'orders']),
  })
);

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
  const [entriesResult, targetsResult, overallResult, standardsResult] = await Promise.all([
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
    auth.context.admin.rpc('uhp_vp_monthly_actuals'),
    auth.context.admin.from('uhp_vp_standard_targets').select('*'),
  ]);
  if (entriesResult.error || targetsResult.error || overallResult.error || standardsResult.error) {
    return NextResponse.json({ error: 'Failed to calculate summary' }, { status: 500 });
  }
  const effectiveTargets = resolveVolumePointTargets(
    UHP_VP_CATEGORY_VALUES,
    fromMonth,
    toMonth,
    targetsResult.data ?? [],
    standardsResult.data ?? []
  );
  const categories = summarizeVolumePointCategories(
    UHP_VP_CATEGORY_VALUES,
    entriesResult.data ?? [],
    effectiveTargets
  );
  const actuals = monthlyActualsSchema.safeParse(overallResult.data);
  if (!actuals.success) {
    return NextResponse.json({ error: 'Invalid monthly actuals response' }, { status: 500 });
  }
  const overall = actuals.data.map((row) => ({
    reportingMonth: row.reporting_month,
    volumePoints: Number(row.volume_points),
    source: row.source,
  }));
  const selectedActuals = overall.filter(
    (row) => row.reportingMonth >= fromReportingMonth && row.reportingMonth <= toReportingMonth
  );
  return NextResponse.json({
    data: {
      reportingMonth: fromReportingMonth,
      fromMonth,
      toMonth,
      categories,
      effectiveTargets,
      standardTargets: standardsResult.data ?? [],
      totalActualVp: selectedActuals.reduce((sum, row) => sum + row.volumePoints, 0),
      finalizedMonths: selectedActuals
        .filter((row) => row.source === 'final')
        .map((row) => row.reportingMonth),
      totalTargetVp: categories.reduce((sum, row) => sum + row.targetVp, 0),
      totalForecastVp: categories.reduce((sum, row) => sum + row.forecastVp, 0),
      overall,
    },
  });
}
