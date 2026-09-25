import { logActivity } from '@/lib/audit';
import { uhpClientActivitySchema } from '@/lib/schemas/uhp.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { requireUhpModule } from '../../../_lib';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = uhpClientActivitySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid activity' }, { status: 400 });
  const { id } = await params;
  const input = parsed.data;
  const { data, error } = await auth.context.admin
    .from('uhp_client_activities')
    .insert({
      client_id: id,
      activity_type: input.activityType,
      direction: input.direction ?? null,
      channel: input.channel ?? null,
      title: input.title,
      notes: input.notes ?? null,
      status: input.status,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      follow_up_at: input.followUpAt ?? null,
      reply_received: input.replyReceived,
      prospect_outcome: input.prospectOutcome ?? null,
      appointment_type: input.appointmentType ?? null,
      appointment_at: input.appointmentAt ?? null,
      created_by: auth.context.userId,
      updated_by: auth.context.userId,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  if (input.prospectOutcome) {
    await auth.context.admin
      .from('uhp_clients')
      .update({ interest_state: input.prospectOutcome, updated_by: auth.context.userId })
      .eq('id', id);
  }
  void logActivity(auth.context.admin, {
    userId: auth.context.userId,
    action: 'create_uhp_client_activity',
    tableName: 'uhp_client_activities',
    recordId: data.id,
    metadata: { clientId: id },
  });
  return NextResponse.json({ data }, { status: 201 });
}
