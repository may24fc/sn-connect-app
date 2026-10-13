import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const categoryCode = z.enum([
  'advertising',
  'ai_cloud',
  'software',
  'travel',
  'meals',
  'office_supplies',
  'equipment',
  'rent_workspace',
  'utilities',
  'maintenance',
  'professional_services',
  'other',
]);
const paymentSource = z.enum(['unknown', 'personal_card', 'company_card', 'bank_transfer']);
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])-01$/;
const CATALOG_PAGE_SIZE = 1000;
const CATALOG_MAX_ROWS = 10000;

type CatalogPage<T> = {
  data: Array<T> | null;
  count: number | null;
  error: { message: string } | null;
};

async function readCompleteCatalog<T>(
  makePage: (start: number, end: number) => PromiseLike<CatalogPage<T>>
) {
  const rows: Array<T> = [];
  while (rows.length <= CATALOG_MAX_ROWS) {
    const page = await makePage(rows.length, rows.length + CATALOG_PAGE_SIZE - 1);
    if (page.error || page.count === null)
      return { rows: null, error: 'Could not load complete finance catalog' };
    if (page.count > CATALOG_MAX_ROWS)
      return { rows: null, error: 'Finance catalog exceeds 10,000 rows' };
    rows.push(...(page.data ?? []));
    if (rows.length === page.count) return { rows, error: null };
    if (rows.length > CATALOG_MAX_ROWS)
      return { rows: null, error: 'Finance catalog exceeds 10,000 rows' };
    if (!page.data?.length || rows.length > page.count)
      return { rows: null, error: 'Finance catalog read was incomplete' };
  }
  return { rows: null, error: 'Finance catalog exceeds 10,000 rows' };
}
const mutation = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('budget'),
    categoryCode,
    month: z.string().regex(monthPattern),
    amountAud: z.number().positive().max(1e10),
  }),
  z.object({
    kind: z.literal('budget_clear'),
    categoryCode,
    month: z.string().regex(monthPattern),
  }),
  z.object({
    kind: z.literal('subscription'),
    vendorName: z.string().trim().min(1).max(255),
    categoryCode,
    paymentSource,
    monthlyAmountAud: z.number().nonnegative().max(1e10).nullable(),
    seats: z.number().int().nonnegative().nullable(),
    nextRenewal: z.string().date().nullable(),
    notes: z.string().max(2000).nullable(),
  }),
]);

export async function GET(request: NextRequest) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = context.admin as any;
  const month =
    request.nextUrl.searchParams.get('month') ?? `${new Date().toISOString().slice(0, 7)}-01`;
  if (!monthPattern.test(month))
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
  const [categories, budgets, subscriptions] = await Promise.all([
    db.from('finance_categories').select('code,name,example,sort_order').order('sort_order'),
    db.from('finance_budgets').select('id,category_code,month,amount_aud').eq('month', month),
    readCompleteCatalog<{ id: string }>((start, end) =>
      db
        .from('finance_subscriptions')
        .select('*', { count: 'exact' })
        .order('vendor_name')
        .order('id')
        .range(start, end)
    ),
  ]);
  if (categories.error || budgets.error || subscriptions.error || !subscriptions.rows)
    return NextResponse.json(
      { error: subscriptions.error ?? 'Could not load finance catalog' },
      { status: subscriptions.error?.includes('10,000') ? 413 : 500 }
    );
  const charges = await readCompleteCatalog<{ subscription_id: string; last_charged: string }>(
    (start, end) =>
      db
        .from('finance_subscription_last_charges')
        .select('subscription_id,last_charged', { count: 'exact' })
        .order('subscription_id')
        .range(start, end)
  );
  if (!charges.rows)
    return NextResponse.json(
      { error: charges.error },
      { status: charges.error?.includes('10,000') ? 413 : 500 }
    );
  const latestCharge = new Map<string, string>();
  for (const charge of charges.rows) latestCharge.set(charge.subscription_id, charge.last_charged);
  return NextResponse.json({
    data: {
      categories: categories.data,
      budgets: budgets.data,
      subscriptions: subscriptions.rows.map((item) => ({
        ...item,
        last_charged: latestCharge.get(item.id) ?? null,
      })),
    },
  });
}

export async function POST(request: NextRequest) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = mutation.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid finance catalog entry' }, { status: 400 });
  const db = context.admin as any;
  if (parsed.data.kind === 'budget') {
    const { data, error } = await db
      .from('finance_budgets')
      .upsert(
        {
          category_code: parsed.data.categoryCode,
          month: parsed.data.month,
          amount_aud: parsed.data.amountAud,
          updated_by: context.user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'category_code,month' }
      )
      .select()
      .single();
    if (error) return NextResponse.json({ error: 'Could not save budget' }, { status: 500 });
    return NextResponse.json({ data });
  }
  if (parsed.data.kind === 'budget_clear') {
    const { error } = await db
      .from('finance_budgets')
      .delete()
      .eq('category_code', parsed.data.categoryCode)
      .eq('month', parsed.data.month);
    if (error) return NextResponse.json({ error: 'Could not clear budget' }, { status: 500 });
    return NextResponse.json({ data: null });
  }
  const { data, error } = await db
    .from('finance_subscriptions')
    .insert({
      vendor_name: parsed.data.vendorName,
      category_code: parsed.data.categoryCode,
      payment_source: parsed.data.paymentSource,
      monthly_amount_aud: parsed.data.monthlyAmountAud,
      seats: parsed.data.seats,
      next_renewal: parsed.data.nextRenewal,
      notes: parsed.data.notes,
      created_by: context.user.id,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: 'Could not save subscription' }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
