import { buildMonthlyExpenseReport } from '@/lib/expenses/monthly-report';
import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const createSchema = z.object({ month: monthSchema, status: z.enum(['draft', 'final']) });

export async function GET(request: NextRequest) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const month = monthSchema.safeParse(request.nextUrl.searchParams.get('month'));
  if (!month.success) return NextResponse.json({ error: 'Month must be YYYY-MM' }, { status: 400 });
  const snapshotId = request.nextUrl.searchParams.get('snapshot');
  if (snapshotId) {
    if (!z.string().uuid().safeParse(snapshotId).success) return NextResponse.json({ error: 'Invalid snapshot ID' }, { status: 400 });
    const saved = await (context.admin as any).from('finance_report_snapshots')
      .select('id,report_month,status,report_data,exception_count,created_at,finalized_at')
      .eq('id', snapshotId).eq('report_month', `${month.data}-01`).single();
    if (saved.error || !saved.data) return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    return NextResponse.json({ data: saved.data }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  const report = await buildMonthlyExpenseReport(context.admin, new Date(`${month.data}-01T00:00:00Z`));
  const { data: snapshots, error } = await (context.admin as any).from('finance_report_snapshots').select('id,status,exception_count,created_at,finalized_at').eq('report_month', `${month.data}-01`).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load report history' }, { status: 500 });
  return NextResponse.json({ data: { report, snapshots } });
}

export async function POST(request: NextRequest) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid report request' }, { status: 400 });
  const report = await buildMonthlyExpenseReport(context.admin, new Date(`${parsed.data.month}-01T00:00:00Z`));
  const { data, error } = await (context.admin as any).rpc('create_finance_report_snapshot', { target_month: `${parsed.data.month}-01`, actor_id: context.user.id, payload: report, make_final: parsed.data.status === 'final' });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ data: { id: data, status: parsed.data.status } }, { status: 201 });
}
