import { inngest } from '@/lib/inngest/client';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from('users')
    .select('role,status,deleted_at')
    .eq('id', user.id)
    .maybeSingle();
  if (
    !profile ||
    profile.role !== 'super_admin' ||
    profile.deleted_at ||
    ['inactive', 'terminated'].includes(profile.status)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { data: delivery, error } = await admin
    .from('telegram_ticket_delivery_events')
    .update({ status: 'pending', last_error: null })
    .eq('id', id)
    .eq('status', 'failed')
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Failed to prepare retry' }, { status: 500 });
  if (!delivery)
    return NextResponse.json(
      { error: 'Only failed delivery events can be retried' },
      { status: 409 }
    );

  await inngest.send({
    name: 'telegram/ticket-delivery.requested',
    data: { deliveryEventId: delivery.id },
  });
  return NextResponse.json({ ok: true });
}
