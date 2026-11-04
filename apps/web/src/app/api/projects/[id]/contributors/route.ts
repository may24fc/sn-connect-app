import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { normalizeDepartmentName, normalizePersonName } from '@/lib/people/directory-people';
import {
  createProjectMemberInvitations,
  invitationRpcResultSchema,
  projectInvitationError,
} from '@/lib/projects/member-invitations';
import { contributorAddSchema } from '@/lib/schemas/project.schema';
import { getProjectAuthedContext } from '../../_lib';
import {
  canManageProject,
  classifyProjectMemberAssignments,
} from '@/lib/work-management/permissions';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CANDIDATE_PAGE_SIZE = 25;

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CandidateRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  position: string | null;
  department_name: string | null;
  role: string | null;
}

/** Escapes LIKE wildcards so a search for "50%" matches literally. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

async function ensureCanManageContributors(
  supabaseAdmin: ReturnType<
    typeof import('@/lib/supabase/server').createSupabaseAdminClient
  >,
  projectId: string,
  userId: string,
  role: string | null
): Promise<boolean> {
  return canManageProject(supabaseAdmin, projectId, userId, role);
}

/**
 * GET /api/projects/[id]/contributors?search=
 * People who can be added as contributors, for whoever may manage this project's contributors.
 * Project leads are usually associates without directory access, so this returns only the
 * identity the picker shows (no email or contact details) and excludes current contributors.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, user, role } = auth.context;
  if (!(await ensureCanManageContributors(supabaseAdmin, projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const search = (request.nextUrl.searchParams.get('search') ?? '').trim().slice(0, 100);

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('project_contributors')
    .select('user_id')
    .eq('project_id', projectId);

  if (existingError) {
    return NextResponse.json({ error: 'Failed to load contributors' }, { status: 500 });
  }

  let query = supabaseAdmin
    .from('employee_directory')
    .select('user_id, full_name, avatar_url, position, department_name, role', { count: 'exact' })
    .not('user_id', 'is', null)
    .neq('status', 'terminated');

  const existingIds = (existing ?? []).map((row: { user_id: string }) => row.user_id);
  if (existingIds.length > 0) {
    query = query.filter('user_id', 'not.in', `(${existingIds.join(',')})`);
  }

  if (search) {
    query = query.ilike('full_name', `%${escapeLikePattern(search)}%`);
  }

  const { data, error, count } = await query
    .order('full_name', { ascending: true })
    .range(0, CANDIDATE_PAGE_SIZE - 1);

  if (error) {
    return NextResponse.json({ error: 'Failed to load people' }, { status: 500 });
  }

  const rows = (data ?? []) as Array<CandidateRow>;
  const classification = await classifyProjectMemberAssignments(
    supabaseAdmin, user.id, role, rows.map((row) => row.user_id)
  );
  if (!classification.ok) {
    return NextResponse.json({ error: classification.error }, { status: classification.status });
  }
  const invitationIds = new Set(classification.invitationUserIds);
  return NextResponse.json({
    data: rows.map((row) => ({
      user_id: row.user_id,
      full_name: normalizePersonName(row.full_name) ?? 'Unnamed account',
      avatar_url: row.avatar_url,
      position: row.position?.trim() || null,
      department_name: normalizeDepartmentName(row.department_name),
      role: row.role,
      requires_invitation: invitationIds.has(row.user_id),
    })),
    total: count ?? 0,
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  if (!(await ensureCanManageContributors(supabaseAdmin, projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = contributorAddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin.rpc('assign_project_member', {
    p_project_id: projectId,
    p_actor: user.id,
    p_target: parsed.data.userId,
    p_role: parsed.data.role,
  });
  if (error) {
    console.error('Failed to assign project member:', error.code);
    return NextResponse.json({ error: 'Failed to update project membership' }, { status: 500 });
  }
  const result = invitationRpcResultSchema.safeParse(data);
  if (!result.success || (!result.data.ok && !result.data.error)) {
    console.error('Project membership assignment returned an invalid response');
    return NextResponse.json({ error: 'Failed to update project membership' }, { status: 500 });
  }
  let outcome: 'assigned' | 'invited' = 'assigned';
  if (result.data.error === 'invitation_required') {
    const invitation = await createProjectMemberInvitations(supabaseAdmin, projectId, user.id, [
      { userId: parsed.data.userId, role: parsed.data.role },
    ]);
    if (!invitation.ok) {
      return NextResponse.json({ error: invitation.error }, { status: invitation.status });
    }
    outcome = 'invited';
  } else if (result.data.error) {
    const failure = projectInvitationError(result.data.error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }

  logActivity(supabase, {
    userId: user.id,
    action: outcome === 'invited' ? 'project_member_invited' : 'project_contributor_added',
    tableName: outcome === 'invited' ? 'project_member_invitations' : 'project_contributors',
    recordId: projectId,
    metadata: { contributor: parsed.data.userId, role: parsed.data.role },
  });

  return NextResponse.json({ ok: true, outcome }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  if (!(await ensureCanManageContributors(supabaseAdmin, projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userIdToRemove = request.nextUrl.searchParams.get('userId');
  const parsedUserId = z.string().uuid().safeParse(userIdToRemove);
  if (!parsedUserId.success) {
    return NextResponse.json({ error: 'A valid userId query parameter is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('remove_project_member', {
    p_project_id: projectId,
    p_actor: user.id,
    p_target: parsedUserId.data,
  });
  if (error) {
    console.error('Failed to remove project member:', error.code);
    return NextResponse.json({ error: 'Failed to remove project member' }, { status: 500 });
  }
  const result = invitationRpcResultSchema.safeParse(data);
  if (!result.success || (!result.data.ok && !result.data.error)) {
    console.error('Project member removal returned an invalid response');
    return NextResponse.json({ error: 'Failed to remove project member' }, { status: 500 });
  }
  if (result.data.error) {
    const failure = projectInvitationError(result.data.error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }

  logActivity(supabase, {
    userId: user.id,
    action: 'project_contributor_removed',
    tableName: 'project_contributors',
    recordId: projectId,
    metadata: { contributor: userIdToRemove },
  });

  return NextResponse.json({ ok: true });
}
