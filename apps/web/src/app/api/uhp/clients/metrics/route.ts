import { uhpMetricsQuerySchema } from '@/lib/schemas/uhp.schema';
import { summarizeUhpOutreach } from '@/lib/uhp';
import { type NextRequest, NextResponse } from 'next/server';
import { fetchUhpOutreachRows, requireUhpModule } from '../../_lib';

export async function GET(request: NextRequest) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const now = new Date();
  const params = request.nextUrl.searchParams;
  const parsed = uhpMetricsQuerySchema.safeParse({
    from:
      params.get('from') ??
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
    to: params.get('to') ?? now.toISOString(),
  });
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid metrics period' }, { status: 400 });
  const { from, to } = parsed.data;

  const result = await fetchUhpOutreachRows(auth.context.admin, from, to);
  if (!result.ok)
    return NextResponse.json({ error: 'Failed to calculate metrics' }, { status: 500 });
  const summary = summarizeUhpOutreach(result.rows, 0);
  return NextResponse.json({
    data: {
      outreachAttempts: summary.outreachAttempts,
      replies: summary.clientsReplied,
      responseRate: summary.responseRate,
      interested: summary.interested,
      declined: summary.declined,
      wellnessEvaluationsScheduled: summary.wellnessEvaluationsScheduled,
      callsScheduled: summary.callsScheduled,
      from,
      to,
    },
  });
}
