import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const decisionSchema = z.object({ expenseId: z.string().uuid(), outcome: z.enum(['approved', 'rejected']) });

export async function GET() {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await (context.admin as any).from('expense_entries')
    .select('id,submitted_by,vendor_name,transaction_date,total_amount,currency,category_code,source_type,match_status,matched_entry_id,approval_state')
    .eq('approval_state', 'pending').is('deleted_at', null)
    .neq('match_status', 'variance_flagged').neq('match_status', 'resolved')
    .order('transaction_date', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: 'Could not load approval queue' }, { status: 500 });
  return NextResponse.json({ data: (data ?? []).filter((row: { id: string; matched_entry_id: string | null; source_type: string }) => !row.matched_entry_id || row.source_type === 'staff_request') });
}

export async function POST(request: NextRequest) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid approval decision' }, { status: 400 });
  const { data, error } = await (context.admin as any).rpc('decide_finance_expense', {
    entry_id: parsed.data.expenseId, actor_id: context.user.id, outcome: parsed.data.outcome,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  if (!data) return NextResponse.json({ error: 'This entry is no longer pending, or its submitter cannot approve it' }, { status: 409 });
  return NextResponse.json({ data: { approved: parsed.data.outcome === 'approved' } });
}
