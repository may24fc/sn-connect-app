import { uhpOutreachDigestRunSchema } from '@/lib/schemas/uhp.schema';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { summarizeUhpOutreach } from '@/lib/uhp';
import { type NextRequest, NextResponse } from 'next/server';
import { isValidN8nCallback } from '../../_lib';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  if (!isValidN8nCallback(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const intervalEndedAt = new Date().toISOString();
  const intervalStartedAt = new Date(Date.now() - WEEK_MS).toISOString();

  const [activitiesResult, newClientsResult] = await Promise.all([
    admin
      .from('uhp_client_activities')
      .select('client_id, direction, reply_received, prospect_outcome, appointment_type')
      .is('deleted_at', null)
      .eq('migration_review_required', false)
      .gte('occurred_at', intervalStartedAt)
      .lte('occurred_at', intervalEndedAt),
    admin
      .from('uhp_clients')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', intervalStartedAt)
      .lte('created_at', intervalEndedAt),
  ]);
  if (activitiesResult.error || newClientsResult.error) {
    return NextResponse.json({ error: 'Failed to build digest' }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      intervalStartedAt,
      intervalEndedAt,
      summary: summarizeUhpOutreach(activitiesResult.data ?? [], newClientsResult.count ?? 0),
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isValidN8nCallback(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = uhpOutreachDigestRunSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid digest run' }, { status: 400 });
  const input = parsed.data;
  const { data, error } = await createSupabaseAdminClient()
    .from('uhp_outreach_digest_runs')
    .upsert(
      {
        interval_started_at: input.intervalStartedAt,
        interval_ended_at: input.intervalEndedAt,
        destination_key: input.destinationKey,
        idempotency_key: input.idempotencyKey,
        status: input.status,
        summary_json: input.summary,
        n8n_execution_id: input.n8nExecutionId ?? null,
        telegram_message_id: input.telegramMessageId ?? null,
        error_message: input.errorMessage ?? null,
        sent_at: input.sentAt ?? null,
      },
      { onConflict: 'idempotency_key' }
    )
    .select('id, status')
    .single();
  if (error) return NextResponse.json({ error: 'Failed to record digest run' }, { status: 500 });
  return NextResponse.json({ data });
}
