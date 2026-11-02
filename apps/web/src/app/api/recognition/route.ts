import { RECOGNITION_CATEGORIES, requireRecognitionUser } from '@/lib/recognition';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const nominationSchema = z.object({
  nomineeUserId: z.string().uuid(),
  category: z.enum(['impact_delivery', 'accountability_timeliness', 'collaboration_initiative']),
  resultSummary: z.string().trim().min(10).max(1000),
  workPeriodStart: z.string().date(),
  workPeriodEnd: z.string().date(),
  evidenceUrl: z.string().url().max(1000).optional().or(z.literal('')),
});

export async function GET() {
  const auth = await requireRecognitionUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data: users } = await auth.admin
    .from('users')
    .select('id,role,status,deleted_at')
    .is('deleted_at', null)
    .not('status', 'in', '(terminated,inactive)')
    .in('role', ['employee', 'associate', 'admin', 'super_admin']);
  const userIds = (users ?? []).map((user) => user.id).filter((id) => id !== auth.user.id);
  const { data: employees } = userIds.length
    ? await auth.admin
        .from('employees')
        .select('user_id,first_name,last_name,position')
        .in('user_id', userIds)
        .is('deleted_at', null)
    : { data: [] };
  const { data: nominations } = await auth.admin
    .from('recognition_nominations')
    .select('*')
    .eq('nominator_user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(25);
  return NextResponse.json({
    categories: RECOGNITION_CATEGORIES,
    nominees: (employees ?? []).map((employee) => ({
      userId: employee.user_id,
      name: `${employee.first_name} ${employee.last_name}`.trim(),
      position: employee.position,
    })),
    nominations: nominations ?? [],
  });
}

export async function POST(request: Request) {
  const auth = await requireRecognitionUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = nominationSchema.safeParse(await request.json());
  if (!parsed.success || parsed.data.workPeriodEnd < parsed.data.workPeriodStart)
    return NextResponse.json(
      { error: 'Invalid nomination', details: parsed.success ? undefined : parsed.error.flatten() },
      { status: 400 }
    );
  if (parsed.data.nomineeUserId === auth.user.id)
    return NextResponse.json({ error: 'Self-nominations are not allowed' }, { status: 400 });
  const { data: nominee } = await auth.admin
    .from('users')
    .select('id,role,status,deleted_at')
    .eq('id', parsed.data.nomineeUserId)
    .maybeSingle();
  if (
    !nominee ||
    nominee.deleted_at ||
    ['terminated', 'inactive'].includes(nominee.status) ||
    !['employee', 'associate', 'admin', 'super_admin'].includes(nominee.role)
  )
    return NextResponse.json({ error: 'Nominee must be an active employee' }, { status: 400 });
  const { data, error } = await auth.admin
    .from('recognition_nominations')
    .insert({
      nominator_user_id: auth.user.id,
      nominee_user_id: parsed.data.nomineeUserId,
      category: parsed.data.category,
      result_summary: parsed.data.resultSummary,
      work_period_start: parsed.data.workPeriodStart,
      work_period_end: parsed.data.workPeriodEnd,
      evidence_url: parsed.data.evidenceUrl || null,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Failed to save nomination' }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
