import { uhpReminderRunSchema } from '@/lib/schemas/uhp.schema';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { isValidN8nCallback } from '../../_lib';

export async function POST(request: NextRequest) {
  if (!isValidN8nCallback(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = uhpReminderRunSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid reminder run' }, { status: 400 });
  const input = parsed.data;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('uhp_reminder_runs')
    .upsert(
      {
        reminder_type: input.reminderType,
        deadline_date: input.deadlineDate ?? null,
        scheduled_for: input.scheduledFor,
        destination_key: input.destinationKey,
        idempotency_key: input.idempotencyKey,
        status: input.status,
        n8n_execution_id: input.n8nExecutionId ?? null,
        telegram_message_id: input.telegramMessageId ?? null,
        error_message: input.errorMessage ?? null,
        metadata: input.metadata,
        sent_at: input.sentAt ?? null,
      },
      { onConflict: 'idempotency_key' }
    )
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Failed to record reminder run' }, { status: 500 });
  return NextResponse.json({ data });
}
