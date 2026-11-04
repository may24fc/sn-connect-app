import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { loadDirectoryPeople } from '@/lib/people/directory-people';
import {
  createProjectMemberInvitations,
  invitationRpcResultSchema,
  projectInvitationError,
} from '@/lib/projects/member-invitations';
import { projectUpdateSchema } from '@/lib/schemas/project.schema';
import { getProjectAuthedContext, isProjectAdmin, userCanAccessProject } from '../_lib';
import { canManageProject } from '@/lib/work-management/permissions';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, user, role } = auth.context;
  const allowed = await userCanAccessProject(supabaseAdmin, id, user.id, role);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: contributorRows } = await supabaseAdmin
    .from('project_contributors')
    .select('user_id, role, joined_at')
    .eq('project_id', id);

  // The caller is already authorized for this project, so its members' display identities are
  // resolved with the admin client the same way the contributor rows are.
  const contributors = (contributorRows ?? []) as Array<{
    user_id: string;
    role: string;
    joined_at: string;
  }>;
  const people = await loadDirectoryPeople(supabaseAdmin, [
    project.lead_user_id as string | null,
    ...contributors.map((contributor) => contributor.user_id),
  ]);
  const leadPerson = people.get(project.lead_user_id as string);

  const { data: pointEvents, error: pointsError } = await supabaseAdmin
    .from('points_events')
    .select('points')
    .eq('source_project_id', id);

  if (pointsError) {
    return NextResponse.json({ error: pointsError.message }, { status: 500 });
  }

  const earnedPoints = (pointEvents ?? []).reduce(
    (total: number, event: { points: number | null }) => total + (event.points ?? 0),
    0
  );
  const canManage = await canManageProject(supabaseAdmin, id, user.id, role);

  return NextResponse.json({
    data: {
      ...project,
      earned_points: earnedPoints,
      lead_name: leadPerson?.name ?? null,
      lead_avatar_url: leadPerson?.avatarUrl ?? null,
      contributors: contributors.map((contributor) => {
        const person = people.get(contributor.user_id);
        return {
          ...contributor,
          name: person?.name ?? null,
          avatar_url: person?.avatarUrl ?? null,
        };
      }),
      can_manage: canManage,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  const allowed = await canManageProject(supabaseAdmin, id, user.id, role);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;

  if (input.leadUserId !== undefined || input.supervisorId !== undefined) {
    if (Object.keys(input).length !== 1) {
      return NextResponse.json(
        { error: 'Change project leadership separately from other project fields' },
        { status: 400 }
      );
    }
    if (input.supervisorId !== undefined && !isProjectAdmin(role)) {
      return NextResponse.json({ error: 'Only admins can change the project supervisor' }, { status: 403 });
    }
    const response = input.leadUserId !== undefined
      ? await supabaseAdmin.rpc('set_project_primary_lead', {
          p_project_id: id, p_actor: user.id, p_target: input.leadUserId,
        })
      : await supabaseAdmin.rpc('set_project_supervisor', {
          p_project_id: id, p_actor: user.id, p_target: input.supervisorId ?? null,
        });
    if (response.error) {
      console.error('Failed to update project leadership:', response.error.code);
      return NextResponse.json({ error: 'Failed to update project leadership' }, { status: 500 });
    }
    const result = invitationRpcResultSchema.safeParse(response.data);
    if (!result.success || (!result.data.ok && !result.data.error)) {
      console.error('Project leadership update returned an invalid response');
      return NextResponse.json({ error: 'Failed to update project leadership' }, { status: 500 });
    }
    let invitationSent = false;
    if (result.data.error === 'invitation_required' && input.leadUserId) {
      if (!result.data.data?.lead_user_id) {
        console.error('Project leadership invitation did not return the current primary lead');
        return NextResponse.json({ error: 'Failed to invite project lead' }, { status: 500 });
      }
      const invitation = await createProjectMemberInvitations(supabaseAdmin, id, user.id, [
        {
          userId: input.leadUserId,
          role: 'lead',
          makePrimary: true,
          expectedPrimaryId: result.data.data.lead_user_id,
        },
      ]);
      if (!invitation.ok) {
        return NextResponse.json({ error: invitation.error }, { status: invitation.status });
      }
      invitationSent = true;
    } else if (result.data.error) {
      const failure = projectInvitationError(result.data.error);
      return NextResponse.json({ error: failure.error }, { status: failure.status });
    }
    if (!result.data.data) {
      console.error('Project leadership update did not return the project');
      return NextResponse.json({ error: 'Failed to update project leadership' }, { status: 500 });
    }
    logActivity(supabase, {
      userId: user.id,
      action: invitationSent ? 'project_member_invited' : 'project_updated',
      tableName: invitationSent ? 'project_member_invitations' : 'projects',
      recordId: id,
      metadata: { fields: [input.leadUserId !== undefined ? 'lead_user_id' : 'supervisor_id'] },
    });
    return NextResponse.json({ data: result.data.data, invitationSent });
  }

  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.description !== undefined) update.description = input.description;
  if (input.startDate !== undefined) update.start_date = input.startDate;
  if (input.targetEndDate !== undefined) update.target_end_date = input.targetEndDate;
  if (input.status !== undefined) update.status = input.status;
  if (input.pointsTotal !== undefined) update.points_total = input.pointsTotal;
  if (input.progressPct !== undefined) update.progress_pct = input.progressPct;

  if (typeof update.progress_pct === 'number' && update.progress_pct >= 100 && update.status === undefined) {
    update.status = 'completed';
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'project_updated',
    tableName: 'projects',
    recordId: id,
    metadata: { fields: Object.keys(update) },
  });

  return NextResponse.json({ data });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;

  if (!(await canManageProject(supabaseAdmin, id, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'project_deleted',
    tableName: 'projects',
    recordId: id,
  });

  return NextResponse.json({ ok: true });
}
