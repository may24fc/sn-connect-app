import { logActivity } from '@/lib/audit';
import { createNotification } from '@/lib/notifications/create-notification';
import { loadDirectoryPeople } from '@/lib/people/directory-people';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const leadSchema = z.object({
  departmentId: z.string().uuid(),
  userId: z.string().uuid(),
});

async function getContext() {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();
  return profile ? { supabase, supabaseAdmin, user, role: profile.role } : null;
}

export async function GET() {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await context.supabaseAdmin
    .from('department_leads')
    .select('id, department_id, user_id, appointed_at')
    .is('revoked_at', null)
    .order('appointed_at');
  if (error)
    return NextResponse.json({ error: 'Failed to load department leads' }, { status: 500 });

  const people = await loadDirectoryPeople(
    context.supabaseAdmin,
    (data ?? []).map((row) => row.user_id)
  );
  return NextResponse.json({
    data: (data ?? []).map((row) => ({
      ...row,
      name: people.get(row.user_id)?.name ?? 'Unnamed team member',
      avatarUrl: people.get(row.user_id)?.avatarUrl ?? null,
      position: people.get(row.user_id)?.position ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (context.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Only super-admins can appoint department leads' },
      { status: 403 }
    );
  }
  const parsed = leadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid department lead' }, { status: 400 });

  const { departmentId, userId } = parsed.data;
  const { data: candidate } = await context.supabaseAdmin
    .from('users')
    .select('department_id, role, status')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (
    !candidate ||
    candidate.department_id !== departmentId ||
    candidate.status === 'terminated' ||
    !['employee', 'associate'].includes(candidate.role)
  ) {
    return NextResponse.json(
      { error: 'A lead must be an active employee or associate in that department' },
      { status: 400 }
    );
  }

  const { data: existing } = await context.supabaseAdmin
    .from('department_leads')
    .select('id')
    .eq('department_id', departmentId)
    .eq('user_id', userId)
    .is('revoked_at', null)
    .maybeSingle();
  if (existing) return NextResponse.json({ data: existing }, { status: 200 });

  const { data, error } = await context.supabaseAdmin
    .from('department_leads')
    .insert({ department_id: departmentId, user_id: userId, appointed_by: context.user.id })
    .select('id, department_id, user_id, appointed_at')
    .single();
  if (error)
    return NextResponse.json({ error: 'Failed to appoint department lead' }, { status: 500 });

  logActivity(context.supabase, {
    userId: context.user.id,
    action: 'department_lead_appointed',
    tableName: 'department_leads',
    recordId: data.id,
    metadata: { departmentId, leadUserId: userId },
  });
  void createNotification({
    userId,
    type: 'system',
    title: 'Department lead access granted',
    message: 'You can now manage projects and tasks for members of your department.',
    link: '/work-tracker',
    metadata: { departmentId },
  });
  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (context.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Only super-admins can remove department leads' },
      { status: 403 }
    );
  }
  const parsed = leadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid department lead' }, { status: 400 });

  const revokedAt = new Date().toISOString();
  const { data, error } = await context.supabaseAdmin
    .from('department_leads')
    .update({ revoked_at: revokedAt, revoked_by: context.user.id })
    .eq('department_id', parsed.data.departmentId)
    .eq('user_id', parsed.data.userId)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: 'Failed to remove department lead' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Department lead not found' }, { status: 404 });

  logActivity(context.supabase, {
    userId: context.user.id,
    action: 'department_lead_removed',
    tableName: 'department_leads',
    recordId: data.id,
    metadata: parsed.data,
  });
  return NextResponse.json({ success: true });
}
