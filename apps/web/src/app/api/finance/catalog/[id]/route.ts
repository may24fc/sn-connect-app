import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import { convertSubscriptionToAud } from '@/lib/finance/subscription-fx';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const billingCurrency = z.enum(['AUD', 'USD', 'PHP', 'EUR', 'GBP', 'SGD', 'JPY']);
const updateSchema = z
  .object({
    active: z.boolean().optional(),
    monthlyAmountAud: z.number().nonnegative().nullable().optional(),
    billingAmount: z.number().nonnegative().max(1e10).nullable().optional(),
    billingCurrency: billingCurrency.optional(),
    refreshConversion: z.literal(true).optional(),
    nextRenewal: z.string().date().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid subscription update' }, { status: 400 });
  const db = context.admin as any;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.active !== undefined) patch.active = parsed.data.active;
  if (parsed.data.monthlyAmountAud !== undefined) patch.monthly_amount_aud = parsed.data.monthlyAmountAud;
  if (parsed.data.nextRenewal !== undefined) patch.next_renewal = parsed.data.nextRenewal;
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;
  const billingChanged =
    parsed.data.billingAmount !== undefined || parsed.data.billingCurrency !== undefined;
  if (billingChanged || parsed.data.refreshConversion) {
    const current = await db
      .from('finance_subscriptions')
      .select('billing_amount,billing_currency')
      .eq('id', id)
      .maybeSingle();
    if (current.error || !current.data)
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    const amount =
      parsed.data.billingAmount !== undefined ? parsed.data.billingAmount : current.data.billing_amount;
    const currency = parsed.data.billingCurrency ?? current.data.billing_currency;
    const conversion = await convertSubscriptionToAud(
      db,
      amount === null ? null : Number(amount),
      currency
    );
    if (parsed.data.refreshConversion && amount !== null && conversion.monthly_amount_aud === null)
      return NextResponse.json(
        { error: `No ${currency} to AUD rate is available right now. Try again later.` },
        { status: 503 }
      );
    Object.assign(patch, { billing_amount: amount, billing_currency: currency, ...conversion });
  }
  const { data, error } = await db.from('finance_subscriptions').update(patch).eq('id', id).select().maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Subscription not found or update failed' }, { status: 404 });
  return NextResponse.json({ data });
}
