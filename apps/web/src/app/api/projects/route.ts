import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { loadDirectoryPeople } from '@/lib/people/directory-people';
import { projectCreateSchema } from '@/lib/schemas/project.schema';
import { getWorkManagementScope } from '@/lib/work-management/permissions';
import { z } from 'zod';
import { getProjectAuthedContext, isProjectAdmin } from './_lib';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects
 * Query params: status, health, leadUserId, mineOnly=true, page, pageSize
 * Members see their own projects; admins see all.
 */
export async function GET(request: NextRequest) {
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, user, role } = auth.context;
  const params = request.nextUrl.searchParams;
  const status = params.get('status');
  const health = params.get('health');
  const leadUserId = params.get('leadUserId');
  const mineOnly = params.get('mineOnly') === 'true';
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(100, Number.parseInt(params.get('pageSize') ?? '20', 10) || 20);

  let query = supabaseAdmin
    .from('projects')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (health) query = query.eq('health', health);
  if (leadUserId) {
    if (!z.string().uuid().safeParse(leadUserId).success) {
      return NextResponse.json({ error: 'Invalid project lead' }, { status: 400 });
    }
    const { data: leadMemberships, error: leadMembershipsError } = await supabaseAdmin
      .from('project_contributors')
      .select('project_id')
      .eq('user_id', leadUserId)
      .eq('role', 'lead');
    if (leadMembershipsError) {
      console.error('GET /api/projects lead lookup failed:', leadMembershipsError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
    const coLedProjectIds = (leadMemberships ?? []).map((membership) => membership.project_id);
    query = coLedProjectIds.length
      ? query.or(`lead_user_id.eq.${leadUserId},id.in.(${coLedProjectIds.join(',')})`)
      : query.eq('lead_user_id', leadUserId);
  }

  // Non-admins are limited to projects they participate in or actively lead by department.
  if (!isProjectAdmin(role) || mineOnly) {
    const { data: contribRows } = await supabaseAdmin
      .from('project_contributors')
      .select('project_id')
      .eq('user_id', user.id);
    const contribIds = (contribRows ?? []).map((r: { project_id: string }) => r.project_id);
    const managementScope = await getWorkManagementScope(supabaseAdmin, user.id, role);
    let departmentProjectIds: Array<string> = [];
    if (!mineOnly && managementScope.ledDepartmentIds.length > 0) {
      const { data: departmentProjects } = await supabaseAdmin
        .from('project_departments')
        .select('project_id')
        .in('department_id', managementScope.ledDepartmentIds)
        .in('status', ['active', 'pending']);
      departmentProjectIds = (departmentProjects ?? []).map((row) => row.project_id);
    }

    const orFilters = [
      `lead_user_id.eq.${user.id}`,
      `supervisor_id.eq.${user.id}`,
      `created_by.eq.${user.id}`,
    ];
    if (contribIds.length > 0) {
      orFilters.push(`id.in.(${contribIds.join(',')})`);
    }
    if (departmentProjectIds.length > 0) {
      orFilters.push(`id.in.(${departmentProjectIds.join(',')})`);
    }
    query = query.or(orFilters.join(','));
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error('GET /api/projects failed:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }

  const projects = data ?? [];
  const projectIds = projects.map((project: { id: string }) => project.id);

  const earnedPointsByProject = new Map<string, number>();
  if (projectIds.length > 0) {
    const { data: pointEvents, error: pointsError } = await supabaseAdmin
      .from('points_events')
      .select('source_project_id, points')
      .in('source_project_id', projectIds);

    if (pointsError) {
      console.error('GET /api/projects points lookup failed:', pointsError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    for (const event of pointEvents ?? []) {
      if (!event.source_project_id) {
        continue;
      }

      earnedPointsByProject.set(
        event.source_project_id,
        (earnedPointsByProject.get(event.source_project_id) ?? 0) + (event.points ?? 0)
      );
    }
  }

  // v2: total XP potential (sum of milestone complexity tiers + flat monthly bonus) and
  // the project's dominant domain-mastery track (most common milestone department),
  // so the list view can show "earned / max XP" and a department accent per card.
  const COMPLEXITY_TIER_XP: Record<string, number> = {
    routine: 50,
    standard: 150,
    complex: 300,
    epic: 600,
  };
  const maxPointsByProject = new Map<string, number>();
  const departmentCountsByProject = new Map<string, Map<string, number>>();

  if (projectIds.length > 0) {
    const { data: milestoneRows, error: milestonesError } = await supabaseAdmin
      .from('project_milestones')
      .select('project_id, period_type, complexity_tier, department')
      .in('project_id', projectIds)
      .is('deleted_at', null);

    if (milestonesError) {
      console.error('GET /api/projects milestone lookup failed:', milestonesError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    for (const m of milestoneRows ?? []) {
      if (!m.project_id) continue;

      const xp =
        m.period_type === 'month'
          ? 100
          : (COMPLEXITY_TIER_XP[m.complexity_tier ?? 'standard'] ?? 150);
      maxPointsByProject.set(m.project_id, (maxPointsByProject.get(m.project_id) ?? 0) + xp);

      if (m.department) {
        const counts = departmentCountsByProject.get(m.project_id) ?? new Map<string, number>();
        counts.set(m.department, (counts.get(m.department) ?? 0) + 1);
        departmentCountsByProject.set(m.project_id, counts);
      }
    }
  }

  // Contributor and lead identities for the listed projects. The list is already limited to
  // projects the caller may see, and the detail route exposes the same members, so the admin
  // client resolves names without widening access.
  const contributorIdsByProject = new Map<string, Array<string>>();
  const leadIdsByProject = new Map<string, Array<string>>();
  if (projectIds.length > 0) {
    const { data: contributorRows, error: contributorsError } = await supabaseAdmin
      .from('project_contributors')
      .select('project_id, user_id, role')
      .in('project_id', projectIds);

    if (contributorsError) {
      console.error('GET /api/projects contributor lookup failed:', contributorsError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    for (const row of contributorRows ?? []) {
      const ids = contributorIdsByProject.get(row.project_id) ?? [];
      ids.push(row.user_id);
      contributorIdsByProject.set(row.project_id, ids);
      if (row.role === 'lead') {
        const leadIds = leadIdsByProject.get(row.project_id) ?? [];
        leadIds.push(row.user_id);
        leadIdsByProject.set(row.project_id, leadIds);
      }
    }
  }

  const people = await loadDirectoryPeople(supabaseAdmin, [
    ...projects.map((project: { lead_user_id: string | null }) => project.lead_user_id),
    ...Array.from(contributorIdsByProject.values()).flat(),
  ]);

  function getContributorPeople(project: {
    id: string;
    lead_user_id: string | null;
  }): Array<{ user_id: string; name: string | null; avatar_url: string | null }> {
    const ids = contributorIdsByProject.get(project.id) ?? [];
    // Lead first so the card stack always shows who owns the project.
    const ordered = project.lead_user_id
      ? [project.lead_user_id, ...ids.filter((userId) => userId !== project.lead_user_id)]
      : ids;
    return ordered.map((userId) => {
      const person = people.get(userId);
      return { user_id: userId, name: person?.name ?? null, avatar_url: person?.avatarUrl ?? null };
    });
  }

  function getPrimaryDepartment(projectId: string): string | null {
    const counts = departmentCountsByProject.get(projectId);
    if (!counts || counts.size === 0) return null;
    let topDept: string | null = null;
    let topCount = 0;
    for (const [dept, count] of counts) {
      if (count > topCount) {
        topDept = dept;
        topCount = count;
      }
    }
    return topDept;
  }

  return NextResponse.json({
    data: projects.map((project) => ({
      ...project,
      earned_points: earnedPointsByProject.get(project.id) ?? 0,
      max_points_available: maxPointsByProject.get(project.id) ?? 0,
      primary_department: getPrimaryDepartment(project.id),
      lead_name: people.get(project.lead_user_id)?.name ?? null,
      lead_avatar_url: people.get(project.lead_user_id)?.avatarUrl ?? null,
      lead_user_ids: [...new Set([project.lead_user_id, ...(leadIdsByProject.get(project.id) ?? [])])],
      contributor_people: getContributorPeople(project),
    })),
    pagination: { page, pageSize, total: count ?? 0 },
  });
}

/**
 * POST /api/projects
 * Creates a project and its direct assignments or pending invitations atomically.
 */
export async function POST(request: NextRequest) {
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = projectCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;

  if (input.supervisorId && !isProjectAdmin(role)) {
    return NextResponse.json(
      { error: 'Only admins can assign a project supervisor' },
      { status: 403 }
    );
  }

  const { data, error } = await supabaseAdmin.rpc('create_project_with_leads', {
    p_actor: user.id,
    p_input: input,
  });
  if (error) {
    if (error.code === '42501') {
      return NextResponse.json(
        { error: 'Invite an out-of-scope supervisor as a project lead before appointing them' },
        { status: 403 }
      );
    }
    if (error.code === '23514' || error.code === '22007' || error.code === '22008') {
      return NextResponse.json({ error: 'Check the project dates and active lead accounts' }, { status: 400 });
    }
    console.error('POST /api/projects failed:', error.code);
    return NextResponse.json({ error: 'Failed to create project and send invitations' }, { status: 500 });
  }
  const result = z.object({
    data: z.object({ id: z.string().uuid() }).passthrough(),
    pendingInvitationCount: z.number().int().nonnegative(),
    pendingPrimary: z.boolean(),
  }).safeParse(data);
  if (!result.success) {
    console.error('POST /api/projects returned an invalid result');
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }

  logActivity(supabase, {
    userId: user.id,
    action: 'project_created',
    tableName: 'projects',
    recordId: result.data.data.id,
    metadata: { pendingInvitations: result.data.pendingInvitationCount },
  });

  return NextResponse.json(result.data, { status: 201 });
}
