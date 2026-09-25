import { logActivity } from '@/lib/audit';
import { uhpVpEntrySchema } from '@/lib/schemas/uhp.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { requireUhpModule } from '../../_lib';

function monthStart(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

export async function GET(request: NextRequest) {
  const auth = await requireUhpModule('volume_points');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const month = request.nextUrl.searchParams.get('month');
  let query = auth.context.admin
    .from('uhp_vp_entries')
    .select('*')
    .is('deleted_at', null)
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (month && /^\d{4}-\d{2}$/.test(month)) query = query.eq('reporting_month', `${month}-01`);
  const { data, error } = await query.limit(1000);
  if (error)
    return NextResponse.json({ error: 'Failed to load volume-point entries' }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireUhpModule('volume_points');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = uhpVpEntrySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid volume-point entry', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsed.data;
  const { data, error } = await auth.context.admin
    .from('uhp_vp_entries')
    .insert({
      reporting_month: monthStart(input.reportingMonth),
      category: input.category,
      order_id: input.orderId ?? null,
      member_id: input.memberId ?? null,
      member_name: input.memberName,
      member_level: input.memberLevel ?? null,
      discount_percent: input.discountPercent ?? null,
      order_date: input.orderDate,
      payment_status: input.paymentStatus ?? null,
      handler_name: input.handlerName ?? null,
      volume_points: input.volumePoints,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      original_amount_text: input.originalAmountText ?? null,
      created_by: auth.context.userId,
      updated_by: auth.context.userId,
    })
    .select('*')
    .single();
  if (error)
    return NextResponse.json({ error: 'Failed to create volume-point entry' }, { status: 500 });
  void logActivity(auth.context.admin, {
    userId: auth.context.userId,
    action: 'create_uhp_vp_entry',
    tableName: 'uhp_vp_entries',
    recordId: data.id,
  });
  return NextResponse.json({ data }, { status: 201 });
}
