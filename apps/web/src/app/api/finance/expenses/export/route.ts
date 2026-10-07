import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import { writeCsv } from '@/lib/finance/csv';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const filters = z.object({
  tab: z.enum(['all', 'personal_card', 'company_card']).default('all'),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  category: z
    .string()
    .regex(/^[a-z_]{1,40}$/)
    .optional(),
  q: z.string().trim().max(100).optional(),
});

type ExportRow = {
  transaction_date: string;
  vendor_name: string;
  category_code: string | null;
  expense_type: string;
  payment_source: string | null;
  total_amount: number;
  currency: string;
  total_amount_aud: number | null;
  approval_state: string | null;
  payment_status: string | null;
  match_status: string | null;
};

export async function GET(request: NextRequest) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = filters.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid expense export filters' }, { status: 400 });
  const { tab, month, category, q } = parsed.data;
  let query = context.admin
    .from('expense_entries')
    .select(
      'transaction_date,vendor_name,category_code,expense_type,payment_source,total_amount,currency,total_amount_aud,approval_state,payment_status,match_status',
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })
    .order('id', { ascending: false });
  if (tab !== 'all') query = query.eq('payment_source', tab);
  if (category) query = query.eq('category_code', category);
  if (q) query = query.ilike('vendor_name', `%${q.replace(/[\\%_]/g, '\\$&')}%`);
  if (month) {
    const end = new Date(`${month}-01T00:00:00Z`);
    end.setUTCMonth(end.getUTCMonth() + 1);
    query = query
      .gte('transaction_date', `${month}-01`)
      .lt('transaction_date', end.toISOString().slice(0, 10));
  }
  const rows: Array<ExportRow> = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await query.range(offset, offset + 999);
    if (result.error)
      return NextResponse.json({ error: 'Could not export expense ledger' }, { status: 500 });
    if (result.count === null)
      return NextResponse.json(
        { error: 'Could not count expense ledger entries' },
        { status: 500 }
      );
    if (result.count > 10000)
      return NextResponse.json(
        { error: 'Export exceeds 10,000 entries. Select a narrower month or category.' },
        { status: 413 }
      );
    rows.push(...((result.data ?? []) as unknown as Array<ExportRow>));
    if (rows.length >= result.count) break;
    if (!result.data?.length)
      return NextResponse.json(
        { error: 'Expense export was incomplete. Try again.' },
        { status: 500 }
      );
  }
  const csv = writeCsv([
    [
      'Date',
      'Expense',
      'Category',
      'Paid with',
      'Amount',
      'Currency',
      'AUD amount',
      'Approval',
      'Payment',
      'Match',
    ],
    ...rows.map((row) => [
      row.transaction_date,
      row.vendor_name,
      row.category_code ?? row.expense_type,
      row.payment_source ?? 'unknown',
      String(row.total_amount),
      row.currency,
      row.total_amount_aud === null ? '' : String(row.total_amount_aud),
      row.approval_state ?? 'unknown',
      row.payment_status ?? 'unknown',
      row.match_status ?? 'unknown',
    ]),
  ]);
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="finance-expenses-${month ?? 'all'}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
