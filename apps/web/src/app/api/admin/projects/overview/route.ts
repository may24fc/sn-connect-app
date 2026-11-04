import { NextResponse } from 'next/server';
import { getProjectAuthedContext, isProjectAdmin } from '@/app/api/projects/_lib';
import { normalizePersonName } from '@/lib/people/directory-people';

export const dynamic = 'force-dynamic';

interface InternRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  project_count: number;
  avg_progress: number;
  on_track: number;
  at_risk: number;
  overdue: number;
  blocked: number;
  total_points: number;
  current_tier: string;
  current_streak: number;
}

interface OverviewProject {
  id: string;
  lead_user_id: string;
  progress_pct: number | null;
  health: string | null;
}

/**
 * GET /api/admin/projects/overview
 * Aggregated cross-associate project + gamification stats for the admin Projects dashboard.
 */
export async function GET() {
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isProjectAdmin(auth.context.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { supabaseAdmin } = auth.context;

  const { data: interns, error: internsErr } = await supabaseAdmin
    .from('employee_directory')
    .select('user_id, full_name, department_name, role, avatar_url')
    .eq('role', 'associate')
    .neq('status', 'terminated')
    .not('user_id', 'is', null);
  if (internsErr) {
    return NextResponse.json({ error: internsErr.message }, { status: 500 });
  }

  const internIds = (interns ?? [])
    .map((associate: { user_id: string | null }) => associate.user_id)
    .filter((userId): userId is string => !!userId);

  const [
    { data: primaryProjects, error: projectsErr },
    { data: leadMemberships, error: membershipsErr },
    { data: gamification, error: gamificationErr },
  ] = await Promise.all([
      supabaseAdmin
        .from('projects')
        .select('id, lead_user_id, progress_pct, health, status')
        .in(
          'lead_user_id',
          internIds.length ? internIds : ['00000000-0000-0000-0000-000000000000']
        )
        .is('deleted_at', null),
      supabaseAdmin
        .from('project_contributors')
        .select('project_id, user_id')
        .eq('role', 'lead')
        .in('user_id', internIds.length ? internIds : ['00000000-0000-0000-0000-000000000000']),
      supabaseAdmin
        .from('user_gamification')
        .select('user_id, points_total, current_tier, current_streak')
        .in('user_id', internIds.length ? internIds : ['00000000-0000-0000-0000-000000000000']),
  ]);

  if (projectsErr) {
    return NextResponse.json({ error: projectsErr.message }, { status: 500 });
  }

  if (gamificationErr) {
    return NextResponse.json({ error: gamificationErr.message }, { status: 500 });
  }
  if (membershipsErr) {
    return NextResponse.json({ error: membershipsErr.message }, { status: 500 });
  }

  const coLedProjectIds = [...new Set((leadMemberships ?? []).map((row) => row.project_id))];
  const projectsById = new Map<string, OverviewProject>(
    (primaryProjects ?? []).map((project) => [project.id, project])
  );
  if (coLedProjectIds.length) {
    const { data: coLedProjects, error: coLedProjectsErr } = await supabaseAdmin
      .from('projects')
      .select('id, lead_user_id, progress_pct, health, status')
      .in('id', coLedProjectIds)
      .is('deleted_at', null);
    if (coLedProjectsErr) {
      return NextResponse.json({ error: coLedProjectsErr.message }, { status: 500 });
    }
    for (const project of coLedProjects ?? []) projectsById.set(project.id, project);
  }

  const projectIdsByAssociate = new Map<string, Set<string>>();
  function addAssociateProject(userId: string, projectId: string): void {
    if (!projectsById.has(projectId)) return;
    const ids = projectIdsByAssociate.get(userId) ?? new Set<string>();
    ids.add(projectId);
    projectIdsByAssociate.set(userId, ids);
  }
  for (const project of primaryProjects ?? []) addAssociateProject(project.lead_user_id, project.id);
  for (const membership of leadMemberships ?? []) {
    addAssociateProject(membership.user_id, membership.project_id);
  }

  const gamMap = new Map<string, { points_total: number; current_tier: string; current_streak: number }>();
  for (const row of gamification ?? []) {
    gamMap.set(row.user_id, {
      points_total: row.points_total ?? 0,
      current_tier: row.current_tier ?? 'bronze',
      current_streak: row.current_streak ?? 0,
    });
  }

  const rows: InternRow[] = (interns ?? []).flatMap(
    (associate: {
      user_id: string | null;
      full_name: string | null;
      department_name: string | null;
      avatar_url: string | null;
    }) => {
      if (!associate.user_id) {
        return [];
      }

      const myProjects = [...(projectIdsByAssociate.get(associate.user_id) ?? [])].flatMap((id) => {
        const project = projectsById.get(id);
        return project ? [project] : [];
      });
      const total = myProjects.length;
      const sumPct = myProjects.reduce(
        (sum: number, project: { progress_pct: number | null }) => sum + (project.progress_pct ?? 0),
        0
      );
      let on_track = 0;
      let at_risk = 0;
      let overdue = 0;
      let blocked = 0;
      for (const project of myProjects) {
        if (project.health === 'on_track') on_track++;
        else if (project.health === 'at_risk') at_risk++;
        else if (project.health === 'overdue') overdue++;
        else if (project.health === 'blocked') blocked++;
      }

      const gamificationRow = gamMap.get(associate.user_id);
      return [
        {
          user_id: associate.user_id,
          full_name: normalizePersonName(associate.full_name),
          avatar_url: associate.avatar_url,
          department: associate.department_name,
          project_count: total,
          avg_progress: total ? Math.round(sumPct / total) : 0,
          on_track,
          at_risk,
          overdue,
          blocked,
          total_points: gamificationRow?.points_total ?? 0,
          current_tier: gamificationRow?.current_tier ?? 'bronze',
          current_streak: gamificationRow?.current_streak ?? 0,
        },
      ];
    }
  );

  const byDept = new Map<
    string,
    {
      department: string;
      on_track: number;
      at_risk: number;
      overdue: number;
      blocked: number;
      intern_count: number;
      projectIds: Set<string>;
    }
  >();

  for (const row of rows) {
    const key = row.department ?? 'Unassigned';
    const current = byDept.get(key) ?? {
      department: key,
      on_track: 0,
      at_risk: 0,
      overdue: 0,
      blocked: 0,
      intern_count: 0,
      projectIds: new Set<string>(),
    };

    for (const projectId of projectIdsByAssociate.get(row.user_id) ?? []) {
      if (current.projectIds.has(projectId)) continue;
      current.projectIds.add(projectId);
      const health = projectsById.get(projectId)?.health;
      if (health === 'on_track') current.on_track++;
      else if (health === 'at_risk') current.at_risk++;
      else if (health === 'overdue') current.overdue++;
      else if (health === 'blocked') current.blocked++;
    }
    current.intern_count += 1;
    byDept.set(key, current);
  }

  const totals = {
    projects: projectsById.size,
    on_track: 0,
    at_risk: 0,
    overdue: 0,
    blocked: 0,
    points: rows.reduce((sum, row) => sum + row.total_points, 0),
  };
  for (const project of projectsById.values()) {
    if (project.health === 'on_track') totals.on_track++;
    else if (project.health === 'at_risk') totals.at_risk++;
    else if (project.health === 'overdue') totals.overdue++;
    else if (project.health === 'blocked') totals.blocked++;
  }

  return NextResponse.json({
    data: {
      interns: rows.sort((left, right) => right.total_points - left.total_points),
      departments: Array.from(byDept.values(), ({ projectIds: _projectIds, ...department }) => department),
      totals,
    },
  });
}
