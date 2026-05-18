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
 * GET /api/admin/war-room/overview
 * Aggregated cross-intern project + gamification stats for the War Room dashboard.
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
    .map((i: { user_id: string | null }) => i.user_id)
    .filter((userId): userId is string => !!userId);

  const [{ data: projects, error: projectsErr }, { data: gamification, error: gamificationErr }] = await Promise.all([
    supabaseAdmin
      .from('projects')
      .select('id, lead_user_id, progress_pct, health, status')
      .in('lead_user_id', internIds.length ? internIds : ['00000000-0000-0000-0000-000000000000'])
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
  for (const g of gamification ?? []) {
    gamMap.set(g.user_id, {
      points_total: g.points_total ?? 0,
      current_tier: g.current_tier ?? 'bronze',
      current_streak: g.current_streak ?? 0,
    });
  }


  const rows: InternRow[] = (interns ?? []).flatMap((i: { user_id: string | null; full_name: string | null; department_name: string | null }) => {
    if (!i.user_id) {
      return [];
    }

    const myProjects = (projects ?? []).filter((p: { lead_user_id: string }) => p.lead_user_id === i.user_id);
    const total = myProjects.length;
    const sumPct = myProjects.reduce((s: number, p: { progress_pct: number | null }) => s + (p.progress_pct ?? 0), 0);
    let on_track = 0;
    let at_risk = 0;
    let overdue = 0;
    for (const p of myProjects) {
      if (p.health === 'on_track') on_track++;
      else if (p.health === 'at_risk') at_risk++;
      else if (p.health === 'overdue') overdue++;
    }
    const gam = gamMap.get(i.user_id);
    return [{
      user_id: i.user_id,
      full_name: i.full_name,
      department: i.department_name,
      project_count: total,
      avg_progress: total ? Math.round(sumPct / total) : 0,
      on_track,
      at_risk,
      overdue,
      total_points: gam?.points_total ?? 0,
      current_tier: gam?.current_tier ?? 'bronze',
      current_streak: gam?.current_streak ?? 0,
    }];
  });

  // Departmental rollup
  const byDept = new Map<string, { department: string; on_track: number; at_risk: number; overdue: number; intern_count: number }>();
  for (const r of rows) {
    const key = r.department ?? 'Unassigned';
    const cur = byDept.get(key) ?? { department: key, on_track: 0, at_risk: 0, overdue: 0, intern_count: 0 };
    cur.on_track += r.on_track;
    cur.at_risk += r.at_risk;
    cur.overdue += r.overdue;
    cur.intern_count += 1;
    byDept.set(key, cur);
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.projects += r.project_count;
      acc.on_track += r.on_track;
      acc.at_risk += r.at_risk;
      acc.overdue += r.overdue;
      acc.points += r.total_points;
      return acc;
    },
    { projects: 0, on_track: 0, at_risk: 0, overdue: 0, points: 0 }
  );

  return NextResponse.json({
    data: {
      interns: rows.sort((a, b) => b.total_points - a.total_points),
      departments: Array.from(byDept.values()),
      totals,
    },
  });
}
