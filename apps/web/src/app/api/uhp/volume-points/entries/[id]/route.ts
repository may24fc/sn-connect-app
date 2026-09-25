import { logActivity } from '@/lib/audit';
import { uhpVpEntryUpdateSchema } from '@/lib/schemas/uhp.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { requireUhpModule } from '../../../_lib';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUhpModule('volume_points');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = uhpVpEntryUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid entry update' }, { status: 400 });
  const { id } = await params;
  const mapping: Record<string, string> = {
    reportingMonth: 'reporting_month',
    orderId: 'order_id',
    memberId: 'member_id',
    memberName: 'member_name',
    memberLevel: 'member_level',
    discountPercent: 'discount_percent',
    orderDate: 'order_date',
    paymentStatus: 'payment_status',
    handlerName: 'handler_name',
    volumePoints: 'volume_points',
    originalAmountText: 'original_amount_text',
  };
  const updates: Record<string, unknown> = { updated_by: auth.context.userId };
  for (const [key, value] of Object.entries(parsed.data)) {
    updates[mapping[key] ?? key] =
      key === 'reportingMonth' && value ? `${String(value).slice(0, 7)}-01` : (value ?? null);
  }
  const { data, error } = await auth.context.admin
    .from('uhp_vp_entries')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  void logActivity(auth.context.admin, {
    userId: auth.context.userId,
    action: 'update_uhp_vp_entry',
    tableName: 'uhp_vp_entries',
    recordId: id,
  });
  return NextResponse.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUhpModule('volume_points');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const { data, error } = await auth.context.admin
    .from('uhp_vp_entries')
    .update({ deleted_at: new Date().toISOString(), updated_by: auth.context.userId })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  void logActivity(auth.context.admin, {
    userId: auth.context.userId,
    action: 'archive_uhp_vp_entry',
    tableName: 'uhp_vp_entries',
    recordId: id,
  });
  return NextResponse.json({ data });
}
