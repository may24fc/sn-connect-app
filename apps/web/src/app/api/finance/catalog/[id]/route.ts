import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const updateSchema = z.object({ active: z.boolean().optional(), monthlyAmountAud: z.number().nonnegative().nullable().optional(), nextRenewal: z.string().date().nullable().optional(), notes: z.string().max(2000).nullable().optional() }).refine((data) => Object.keys(data).length > 0);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid subscription update' }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.active !== undefined) patch.active = parsed.data.active;
  if (parsed.data.monthlyAmountAud !== undefined) patch.monthly_amount_aud = parsed.data.monthlyAmountAud;
  if (parsed.data.nextRenewal !== undefined) patch.next_renewal = parsed.data.nextRenewal;
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;
  const { data, error } = await (context.admin as any).from('finance_subscriptions').update(patch).eq('id', id).select().maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Subscription not found or update failed' }, { status: 404 });
  return NextResponse.json({ data });
}
