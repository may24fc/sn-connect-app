import { NextResponse } from 'next/server';
import { getProjectAuthedContext, isProjectAdmin } from '@/app/api/projects/_lib';

export const dynamic = 'force-dynamic';

interface InternRow {
  user_id: string;
  full_name: string | null;
  department: string | null;
  project_count: number;
  avg_progress: number;
  on_track: number;
  at_risk: number;
  overdue: number;
  total_points: number;
  current_tier: string;
  current_streak: number;
}

/**
 * GET /api/admin/projects/overview
 * Aggregated cross-intern project + gamification stats for the admin Projects dashboard.
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
    .select('user_id, full_name, department_name, role')
    .eq('role', 'intern')
    .neq('status', 'terminated')
    .not('user_id', 'is', null);
  if (internsErr) {
    return NextResponse.json({ error: internsErr.message }, { status: 500 });
  }

  const internIds = (interns ?? [])
    .map((intern: { user_id: string | null }) => intern.user_id)
    .filter((userId): userId is string => !!userId);

  const [{ data: projects, error: projectsErr }, { data: gamification, error: gamificationErr }] =
    await Promise.all([
      supabaseAdmin
        .from('projects')
        .select('id, lead_user_id, progress_pct, health, status')
        .in(
          'lead_user_id',
          internIds.length ? internIds : ['00000000-0000-0000-0000-000000000000']
        )
        .is('deleted_at', null),
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

  const gamMap = new Map<string, { points_total: number; current_tier: string; current_streak: number }>();
  for (const row of gamification ?? []) {
    gamMap.set(row.user_id, {
      points_total: row.points_total ?? 0,
      current_tier: row.current_tier ?? 'bronze',
      current_streak: row.current_streak ?? 0,
    });
  }

  const rows: InternRow[] = (interns ?? []).flatMap(
    (intern: { user_id: string | null; full_name: string | null; department_name: string | null }) => {
      if (!intern.user_id) {
        return [];
      }

      const myProjects = (projects ?? []).filter(
        (project: { lead_user_id: string }) => project.lead_user_id === intern.user_id
      );
      const total = myProjects.length;
      const sumPct = myProjects.reduce(
        (sum: number, project: { progress_pct: number | null }) => sum + (project.progress_pct ?? 0),
        0
      );
      let on_track = 0;
      let at_risk = 0;
      let overdue = 0;
      for (const project of myProjects) {
        if (project.health === 'on_track') on_track++;
        else if (project.health === 'at_risk') at_risk++;
        else if (project.health === 'overdue') overdue++;
      }

      const gamificationRow = gamMap.get(intern.user_id);
      return [
        {
          user_id: intern.user_id,
          full_name: intern.full_name,
          department: intern.department_name,
          project_count: total,
          avg_progress: total ? Math.round(sumPct / total) : 0,
          on_track,
          at_risk,
          overdue,
          total_points: gamificationRow?.points_total ?? 0,
          current_tier: gamificationRow?.current_tier ?? 'bronze',
          current_streak: gamificationRow?.current_streak ?? 0,
        },
      ];
    }
  );

  const byDept = new Map<
    string,
    { department: string; on_track: number; at_risk: number; overdue: number; intern_count: number }
  >();

  for (const row of rows) {
    const key = row.department ?? 'Unassigned';
    const current = byDept.get(key) ?? {
      department: key,
      on_track: 0,
      at_risk: 0,
      overdue: 0,
      intern_count: 0,
    };

    current.on_track += row.on_track;
    current.at_risk += row.at_risk;
    current.overdue += row.overdue;
    current.intern_count += 1;
    byDept.set(key, current);
  }

  const totals = rows.reduce(
    (acc, row) => {
      acc.projects += row.project_count;
      acc.on_track += row.on_track;
      acc.at_risk += row.at_risk;
      acc.overdue += row.overdue;
      acc.points += row.total_points;
      return acc;
    },
    { projects: 0, on_track: 0, at_risk: 0, overdue: 0, points: 0 }
  );

  return NextResponse.json({
    data: {
      interns: rows.sort((left, right) => right.total_points - left.total_points),
      departments: Array.from(byDept.values()),
      totals,
    },
  });
}