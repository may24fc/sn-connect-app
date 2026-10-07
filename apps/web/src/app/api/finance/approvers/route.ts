import { getFinanceContext } from '@/lib/finance/auth';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const schema = z.object({ ceoUserId: z.string().uuid(), cooUserId: z.string().uuid() }).refine((value) => value.ceoUserId !== value.cooUserId);

export async function GET() {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (context.capabilities.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = context.admin as any;
  const [settings, users] = await Promise.all([
    db.from('finance_approval_settings').select('ceo_user_id,coo_user_id').eq('id', true).single(),
    db.from('users').select('id,role,employee:employees(first_name,last_name)').in('role', ['admin','super_admin']).is('deleted_at', null),
  ]);
  if (settings.error || users.error) return NextResponse.json({ error: 'Could not load approvers' }, { status: 500 });
  const candidates = (users.data ?? []).map((candidate: { employee?: Array<{ first_name?: string; last_name?: string }> | { first_name?: string; last_name?: string } | null }) => ({
    ...candidate,
    employee: Array.isArray(candidate.employee) ? candidate.employee[0] ?? null : candidate.employee ?? null,
  }));
  return NextResponse.json({ data: { settings: settings.data, candidates } });
}

export async function PUT(request: NextRequest) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (context.capabilities.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose two different active leadership users' }, { status: 400 });
  const db = context.admin as any;
  const { data: users, error: lookupError } = await db.from('users').select('id,role').in('id', [parsed.data.ceoUserId, parsed.data.cooUserId]).in('role', ['admin','super_admin']).is('deleted_at', null);
  if (lookupError || users?.length !== 2) return NextResponse.json({ error: 'Approvers must be active leadership users' }, { status: 400 });
  const { data, error } = await db.from('finance_approval_settings').update({ ceo_user_id: parsed.data.ceoUserId, coo_user_id: parsed.data.cooUserId, updated_by: context.user.id, updated_at: new Date().toISOString() }).eq('id', true).select().single();
  if (error) return NextResponse.json({ error: 'Could not save approvers' }, { status: 500 });
  return NextResponse.json({ data });
}
