import { uhpVpDigestRunSchema } from '@/lib/schemas/uhp.schema';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { UHP_VP_CATEGORY_LABELS, UHP_VP_CATEGORY_VALUES } from '@/lib/uhp';
import { type NextRequest, NextResponse } from 'next/server';
import { isValidN8nCallback } from '../../_lib';

export async function GET(request: NextRequest) {
  if (!isValidN8nCallback(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const reportingMonth = `${now.toISOString().slice(0, 7)}-01`;
  const { data: lastRun } = await admin
    .from('uhp_vp_digest_runs')
    .select('interval_ended_at')
    .eq('status', 'sent')
    .order('interval_ended_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const intervalStartedAt =
    lastRun?.interval_ended_at ?? new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const [entriesResult, changedResult, targetsResult] = await Promise.all([
    admin
      .from('uhp_vp_entries')
      .select('category, volume_points')
      .eq('reporting_month', reportingMonth)
      .is('deleted_at', null),
    admin
      .from('uhp_vp_entries')
      .select('id, member_name, category, volume_points, updated_at')
      .gte('updated_at', intervalStartedAt)
      .lte('updated_at', now.toISOString())
      .is('deleted_at', null),
    admin
      .from('uhp_vp_month_targets')
      .select('category, target_vp, forecast_vp')
      .eq('reporting_month', reportingMonth),
  ]);
  if (entriesResult.error || changedResult.error || targetsResult.error) {
    return NextResponse.json({ error: 'Failed to build digest' }, { status: 500 });
  }
  const targets = new Map((targetsResult.data ?? []).map((row) => [row.category, row]));
  const categories = UHP_VP_CATEGORY_VALUES.map((category) => ({
    category,
    label: UHP_VP_CATEGORY_LABELS[category],
    actualVp: (entriesResult.data ?? [])
      .filter((entry) => entry.category === category)
      .reduce((sum, entry) => sum + Number(entry.volume_points), 0),
    targetVp: Number(targets.get(category)?.target_vp ?? 0),
    forecastVp: Number(targets.get(category)?.forecast_vp ?? 0),
  }));
  return NextResponse.json({
    data: {
      intervalStartedAt,
      intervalEndedAt: now.toISOString(),
      reportingMonth,
      changedEntries: changedResult.data ?? [],
      changeCount: changedResult.data?.length ?? 0,
      categories,
      totalActualVp: categories.reduce((sum, row) => sum + row.actualVp, 0),
      totalTargetVp: categories.reduce((sum, row) => sum + row.targetVp, 0),
      totalForecastVp: categories.reduce((sum, row) => sum + row.forecastVp, 0),
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isValidN8nCallback(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = uhpVpDigestRunSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid digest run' }, { status: 400 });
  const input = parsed.data;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('uhp_vp_digest_runs')
    .upsert(
      {
        interval_started_at: input.intervalStartedAt,
        interval_ended_at: input.intervalEndedAt,
        reporting_month: `${input.reportingMonth.slice(0, 7)}-01`,
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
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Failed to record digest run' }, { status: 500 });
  return NextResponse.json({ data });
}
