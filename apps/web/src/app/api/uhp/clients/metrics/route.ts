import { type NextRequest, NextResponse } from 'next/server';
import { requireUhpModule } from '../../_lib';

export async function GET(request: NextRequest) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const from = request.nextUrl.searchParams.get('from') ?? defaultFrom;
  const to = request.nextUrl.searchParams.get('to') ?? now.toISOString();
  const { data, error } = await auth.context.admin
    .from('uhp_client_activities')
    .select('client_id, direction, reply_received, prospect_outcome, appointment_type')
    .is('deleted_at', null)
    .eq('migration_review_required', false)
    .gte('occurred_at', from)
    .lte('occurred_at', to);
  if (error) return NextResponse.json({ error: 'Failed to calculate metrics' }, { status: 500 });
  const rows = data ?? [];
  const outreachAttempts = rows.filter((row) => row.direction === 'outbound').length;
  const replies = rows.filter((row) => row.reply_received).length;
  const interested = new Set(
    rows
      .filter((row) => row.prospect_outcome === 'interested' && row.client_id)
      .map((row) => row.client_id)
  ).size;
  const declined = new Set(
    rows
      .filter((row) => row.prospect_outcome === 'declined' && row.client_id)
      .map((row) => row.client_id)
  ).size;
  return NextResponse.json({
    data: {
      outreachAttempts,
      replies,
      responseRate: outreachAttempts ? Math.round((replies / outreachAttempts) * 1000) / 10 : 0,
      interested,
      declined,
      wellnessEvaluationsScheduled: rows.filter(
        (row) => row.appointment_type === 'wellness_evaluation'
      ).length,
      callsScheduled: rows.filter((row) => row.appointment_type === 'call').length,
      from,
      to,
    },
  });
}
