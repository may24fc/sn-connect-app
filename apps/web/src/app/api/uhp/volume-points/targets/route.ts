import { uhpVpTargetsSchema } from '@/lib/schemas/uhp.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { requireUhpModule } from '../../_lib';

export async function GET(request: NextRequest) {
  const auth = await requireUhpModule('volume_points');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const month = request.nextUrl.searchParams.get('month');
  let query = auth.context.admin.from('uhp_vp_month_targets').select('*').order('reporting_month');
  if (month && /^\d{4}-\d{2}$/.test(month)) query = query.eq('reporting_month', `${month}-01`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Failed to load targets' }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function PUT(request: NextRequest) {
  const auth = await requireUhpModule('volume_points');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = uhpVpTargetsSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid targets' }, { status: 400 });
  const reportingMonth = `${parsed.data.reportingMonth.slice(0, 7)}-01`;
  const rows = parsed.data.targets.map((target) => ({
    reporting_month: reportingMonth,
    category: target.category,
    target_vp: target.targetVp,
    forecast_vp: target.forecastVp,
    created_by: auth.context.userId,
    updated_by: auth.context.userId,
  }));
  const { data, error } = await auth.context.admin
    .from('uhp_vp_month_targets')
    .upsert(rows, { onConflict: 'reporting_month,category' })
    .select('*');
  if (error) return NextResponse.json({ error: 'Failed to save targets' }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
