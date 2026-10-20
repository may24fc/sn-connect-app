import { getProjectAuthedContext, userCanAccessProject } from '@/app/api/projects/_lib';
import { logActivity } from '@/lib/audit';
import { createNotification } from '@/lib/notifications/create-notification';
import {
  canManageProject,
  getActiveProjectDepartmentIds,
  getWorkManagementScope,
  isGlobalWorkManager,
} from '@/lib/work-management/permissions';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const departmentSchema = z.object({ departmentId: z.string().uuid() });
const actionSchema = departmentSchema.extend({
  action: z.enum(['accept', 'reject', 'cancel', 'detach']),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabaseAdmin, user, role } = auth.context;
  if (!(await userCanAccessProject(supabaseAdmin, id, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { data, error } = await supabaseAdmin
    .from('project_departments')
    .select(
      'id, department_id, status, invited_by, invited_at, responded_by, responded_at, department:departments(name)'
    )
    .eq('project_id', id)
    .neq('status', 'removed')
    .order('invited_at');
  if (error)
    return NextResponse.json({ error: 'Failed to load project departments' }, { status: 500 });
  const scope = await getWorkManagementScope(supabaseAdmin, user.id, role);
  const isGlobal = isGlobalWorkManager(role);
  const isProjectManager = await canManageProject(supabaseAdmin, id, user.id, role);
  return NextResponse.json({
    data: (data ?? []).map((row) => {
      const isTargetLead = scope.ledDepartmentIds.includes(row.department_id);
      return {
        ...row,
        actions: {
          accept: row.status === 'pending' && (isGlobal || isTargetLead),
          reject: row.status === 'pending' && (isGlobal || isTargetLead),
          cancel: row.status === 'pending' && (isGlobal || isProjectManager),
          detach: row.status === 'active' && (isGlobal || isTargetLead),
        },
      };
    }),
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabaseAdmin, supabase, user, role } = auth.context;
  if (!(await canManageProject(supabaseAdmin, id, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const parsed = departmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
  const { data: department } = await supabaseAdmin
    .from('departments')
    .select('id')
    .eq('id', parsed.data.departmentId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!department) return NextResponse.json({ error: 'Department not found' }, { status: 404 });

  const activeIds = await getActiveProjectDepartmentIds(supabaseAdmin, id);
  if (activeIds.includes(department.id)) {
    return NextResponse.json(
      { error: 'Department is already part of this project' },
      { status: 409 }
    );
  }
  const direct = isGlobalWorkManager(role);
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('project_departments')
    .upsert(
      {
        project_id: id,
        department_id: department.id,
        status: direct ? 'active' : 'pending',
        invited_by: user.id,
        invited_at: now,
        responded_by: direct ? user.id : null,
        responded_at: direct ? now : null,
        updated_at: now,
      },
      { onConflict: 'project_id,department_id' }
    )
    .select('*')
    .single();
  if (error)
    return NextResponse.json({ error: 'Failed to add project department' }, { status: 500 });
  logActivity(supabase, {
    userId: user.id,
    action: direct ? 'project_department_added' : 'project_department_invited',
    tableName: 'project_departments',
    recordId: data.id,
    metadata: { projectId: id, departmentId: department.id },
  });
  if (!direct) {
    const { data: targetLeads } = await supabaseAdmin
      .from('department_leads')
      .select('user_id')
      .eq('department_id', department.id)
      .is('revoked_at', null);
    for (const lead of targetLeads ?? []) {
      void createNotification({
        userId: lead.user_id,
        type: 'system',
        title: 'Project department invitation',
        message: 'A project has invited your department to share ownership.',
        link: `/projects/${id}`,
        metadata: { projectId: id, departmentId: department.id },
      });
    }
  }
  return NextResponse.json({ data }, { status: direct ? 201 : 202 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabaseAdmin, supabase, user, role } = auth.context;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid department action' }, { status: 400 });

  const { data: membership } = await supabaseAdmin
    .from('project_departments')
    .select('id, status, invited_by')
    .eq('project_id', id)
    .eq('department_id', parsed.data.departmentId)
    .maybeSingle();
  if (!membership)
    return NextResponse.json({ error: 'Project department not found' }, { status: 404 });

  const scope = await getWorkManagementScope(supabaseAdmin, user.id, role);
  const isTargetLead = scope.ledDepartmentIds.includes(parsed.data.departmentId);
  const isGlobal = isGlobalWorkManager(role);
  const isProjectManager = await canManageProject(supabaseAdmin, id, user.id, role);
  const { action } = parsed.data;
  const canRespondForDepartment =
    (action === 'accept' || action === 'reject' || action === 'detach') && isTargetLead;
  const canCancelPendingInvite =
    action === 'cancel' && isProjectManager && membership.status === 'pending';

  if (!(isGlobal || canRespondForDepartment || canCancelPendingInvite)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if ((action === 'accept' || action === 'reject') && membership.status !== 'pending') {
    return NextResponse.json({ error: 'Invitation is no longer pending' }, { status: 409 });
  }
  if (action === 'detach' && membership.status !== 'active') {
    return NextResponse.json(
      { error: 'Department is not active on this project' },
      { status: 409 }
    );
  }
  if (action === 'detach') {
    const activeIds = await getActiveProjectDepartmentIds(supabaseAdmin, id);
    if (activeIds.length <= 1) {
      return NextResponse.json(
        { error: 'A project must keep at least one active department' },
        { status: 409 }
      );
    }
  }

  const nextStatus = action === 'accept' ? 'active' : action === 'reject' ? 'rejected' : 'removed';
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('project_departments')
    .update({ status: nextStatus, responded_by: user.id, responded_at: now, updated_at: now })
    .eq('id', membership.id)
    .select('*')
    .single();
  if (error)
    return NextResponse.json({ error: 'Failed to update project department' }, { status: 500 });
  logActivity(supabase, {
    userId: user.id,
    action: `project_department_${action}`,
    tableName: 'project_departments',
    recordId: membership.id,
    metadata: { projectId: id, departmentId: parsed.data.departmentId },
  });
  if (action === 'accept' || action === 'reject') {
    void createNotification({
      userId: membership.invited_by,
      type: 'system',
      title: action === 'accept' ? 'Department joined project' : 'Department invitation declined',
      message:
        action === 'accept'
          ? 'The invited department accepted shared project ownership.'
          : 'The invited department declined shared project ownership.',
      link: `/projects/${id}`,
      metadata: { projectId: id, departmentId: parsed.data.departmentId },
    });
  }
  return NextResponse.json({ data });
}
