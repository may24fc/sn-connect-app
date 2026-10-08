import { calendarPeriodBounds } from '@/lib/metrics-period';
import { uhpMetricsQuerySchema } from '@/lib/schemas/uhp.schema';
import { summarizeUhpOutreach, summarizeUhpOutreachCohort } from '@/lib/uhp';
import { type NextRequest, NextResponse } from 'next/server';
import { fetchUhpOutreachRows, requireUhpModule } from '../../_lib';

export async function GET(request: NextRequest) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const now = new Date();
  const params = request.nextUrl.searchParams;
  const parsed = uhpMetricsQuerySchema.safeParse({
    from: params.get('from') ?? calendarPeriodBounds('month', now, 'UTC').from,
    to: params.get('to') ?? now.toISOString(),
  });
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid metrics period' }, { status: 400 });
  const { from, to } = parsed.data;

  const isPastPeriod = Date.parse(to) < now.getTime() - 60_000;
  const [result, laterResult] = await Promise.all([
    fetchUhpOutreachRows(auth.context.admin, from, to),
    isPastPeriod
      ? fetchUhpOutreachRows(
          auth.context.admin,
          new Date(Date.parse(to) + 1).toISOString(),
          now.toISOString()
        )
      : Promise.resolve({ ok: true as const, rows: [] }),
  ]);
  if (!result.ok || !laterResult.ok)
    return NextResponse.json({ error: 'Failed to calculate metrics' }, { status: 500 });
  const summary = summarizeUhpOutreach(result.rows, 0);
  const cohort = summarizeUhpOutreachCohort(result.rows, laterResult.rows);
  return NextResponse.json({
    data: {
      ...cohort,
      interested: summary.interested,
      declined: summary.declined,
      wellnessEvaluationsScheduled: summary.wellnessEvaluationsScheduled,
      callsScheduled: summary.callsScheduled,
      from,
      to,
    },
  });
}
