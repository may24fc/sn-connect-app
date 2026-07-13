import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { formatMasteryTitle } from '@hr-portal/ui/constants/mastery';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaderboard?scope=all|interns|employees&period=all|month&limit=50
 * Returns ranked users by points_total (and recent points if period=month).
 */
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const scope = (url.searchParams.get('scope') ?? 'interns') as
      | 'interns'
      | 'employees'
      | 'all';
    const period = (url.searchParams.get('period') ?? 'all') as 'all' | 'month';
    const limit = Math.min(
      100,
      Number.parseInt(url.searchParams.get('limit') ?? '50', 10) || 50
    );

    const supabaseAdmin = createSupabaseAdminClient();

    let usersQuery = supabaseAdmin
      .from('employee_directory')
      .select('user_id, full_name, avatar_url, department_name, role')
      .not('user_id', 'is', null)
      .neq('status', 'terminated');

    if (scope === 'interns') {
      usersQuery = usersQuery.eq('role', 'intern');
    } else if (scope === 'employees') {
      usersQuery = usersQuery.neq('role', 'intern');
    }

    const { data: users, error: usersErr } = await usersQuery;
    if (usersErr) {
      return NextResponse.json({ error: usersErr.message }, { status: 500 });
    }

    const userIds = (users ?? [])
      .map((u: { user_id: string | null }) => u.user_id)
      .filter((userId): userId is string => !!userId);

    if (userIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const { data: gam, error: gamErr } = await supabaseAdmin
      .from('user_gamification')
      .select('user_id, points_total, current_tier, current_streak, longest_streak, last_activity_at')
      .in('user_id', userIds);

    if (gamErr) {
      return NextResponse.json({ error: gamErr.message }, { status: 500 });
    }

    const gamMap = new Map<
      string,
      {
        points_total: number;
        current_tier: string;
        current_streak: number;
        longest_streak: number;
        last_activity_at: string | null;
      }
    >();

    for (const g of gam ?? []) {
      gamMap.set(g.user_id, {
        points_total: g.points_total ?? 0,
        current_tier: g.current_tier ?? 'bronze',
        current_streak: g.current_streak ?? 0,
        longest_streak: g.longest_streak ?? 0,
        last_activity_at: g.last_activity_at,
      });
    }

    const periodMap = new Map<string, number>();
    if (period === 'month') {
      const since = new Date();
      since.setDate(1);
      since.setHours(0, 0, 0, 0);

      const { data: events, error: eventsErr } = await supabaseAdmin
        .from('points_events')
        .select('user_id, points')
        .in('user_id', userIds)
        .gte('created_at', since.toISOString());

      if (eventsErr) {
        return NextResponse.json({ error: eventsErr.message }, { status: 500 });
      }

      for (const e of events ?? []) {
        periodMap.set(e.user_id, (periodMap.get(e.user_id) ?? 0) + (e.points ?? 0));
      }
    }

    const rows = (users ?? []).flatMap(
      (u: {
        user_id: string | null;
        full_name: string | null;
        avatar_url: string | null;
        department_name: string | null;
        role: string | null;
      }) => {
        if (!u.user_id || !u.role) {
          return [];
        }

        const g = gamMap.get(u.user_id);
        return [
          {
            user_id: u.user_id,
            full_name: u.full_name,
            avatar_url: u.avatar_url,
            department: u.department_name,
            role: u.role,
            points_total: g?.points_total ?? 0,
            points_period: periodMap.get(u.user_id) ?? 0,
            current_tier: g?.current_tier ?? 'bronze',
            current_streak: g?.current_streak ?? 0,
            longest_streak: g?.longest_streak ?? 0,
            last_activity_at: g?.last_activity_at ?? null,
            // placeholders for weekly metrics - will be filled below
            weeklyAchieved: 0,
            weeklyTotal: 0,
          },
        ];
      }
    );

    // Compute ISO week and year for current date to lookup weekly commitments
    function getIsoWeekAndYear(d = new Date()) {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return { iso_week: weekNo, iso_year: date.getUTCFullYear() };
    }

    const { iso_week, iso_year } = getIsoWeekAndYear();

    try {
      // Fetch commitments for current week for the users in scope
      const { data: commitments, error: commitmentsErr } = await supabaseAdmin
        .from('weekly_commitments')
        .select('id, user_id')
        .in('user_id', userIds)
        .eq('iso_week', iso_week)
        .eq('iso_year', iso_year)
        .is('deleted_at', null);

      if (!commitmentsErr && commitments && commitments.length > 0) {
        const commitmentIds = commitments.map((c: any) => c.id);

        const { data: items, error: itemsErr } = await supabaseAdmin
          .from('weekly_commitment_items')
          .select('commitment_id, milestone_id')
          .in('commitment_id', commitmentIds);

        if (!itemsErr && items && items.length > 0) {
          const milestoneIds = Array.from(new Set(items.map((it: any) => it.milestone_id)));

          const { data: milestones, error: milestonesErr } = await supabaseAdmin
            .from('project_milestones')
            .select('id, status')
            .in('id', milestoneIds);

          const milestoneStatus = new Map<string, string | null>();
          if (!milestonesErr && milestones) {
            for (const m of milestones) {
              milestoneStatus.set(m.id, m.status ?? null);
            }
          }

          // Map commitment_id -> user_id
          const commitmentToUser = new Map<string, string>();
          for (const c of commitments) commitmentToUser.set(c.id, c.user_id);

          const weeklyTotalMap = new Map<string, number>();
          const weeklyAchievedMap = new Map<string, number>();

          for (const it of items) {
            const uid = commitmentToUser.get(it.commitment_id);
            if (!uid) continue;
            weeklyTotalMap.set(uid, (weeklyTotalMap.get(uid) ?? 0) + 1);
            const st = milestoneStatus.get(it.milestone_id);
            if (st === 'completed') {
              weeklyAchievedMap.set(uid, (weeklyAchievedMap.get(uid) ?? 0) + 1);
            }
          }

          // Attach to rows
          for (const row of rows) {
            const achieved = weeklyAchievedMap.get(row.user_id) ?? 0;
            const total = weeklyTotalMap.get(row.user_id) ?? 0;
            (row as any).weeklyAchieved = achieved;
            (row as any).weeklyTotal = total;
          }
        }
      }
    } catch (err) {
      // Don't block leaderboard if weekly metrics fail; log in server console
      // eslint-disable-next-line no-console
      console.warn('Failed to compute weekly commitment metrics', err);
    }

    rows.sort((a, b) => {
      const va = period === 'month' ? a.points_period : a.points_total;
      const vb = period === 'month' ? b.points_period : b.points_total;
      return vb - va;
    });

    // ── Enrich with badge count + top badge ──────────────────────────────────
    const badgeCountMap = new Map<string, number>();
    const topBadgeMap = new Map<string, string | null>();
    try {
      const { data: userBadges } = await supabaseAdmin
        .from('user_badges')
        .select('user_id, badge_id, earned_at')
        .in('user_id', userIds)
        .order('earned_at', { ascending: false });

      // Badge rarity order for picking the "best" badge to surface
      const RARITY_RANK: Record<string, number> = {
        legendary: 4, rare: 3, uncommon: 2, common: 1,
      };

      const { data: badgeDefs } = await supabaseAdmin
        .from('badge_definitions')
        .select('id, rarity');

      const rarityMap = new Map<string, number>();
      for (const d of badgeDefs ?? []) {
        rarityMap.set(d.id, RARITY_RANK[d.rarity] ?? 1);
      }

      const bestBadge = new Map<string, { id: string; rank: number }>();
      for (const b of userBadges ?? []) {
        badgeCountMap.set(b.user_id, (badgeCountMap.get(b.user_id) ?? 0) + 1);
        const rank = rarityMap.get(b.badge_id) ?? 1;
        const current = bestBadge.get(b.user_id);
        if (!current || rank > current.rank) {
          bestBadge.set(b.user_id, { id: b.badge_id, rank });
        }
      }
      for (const [uid, best] of bestBadge) {
        topBadgeMap.set(uid, best.id);
      }
    } catch {
      // Non-critical — don't block leaderboard if badges fail
    }

    // ── Enrich with top mastery title ────────────────────────────────────────
    const masteryTitleMap = new Map<string, string | null>();
    try {
      const featuredDomainPrefMap = new Map<string, string>();
      const { data: prefRows } = await supabaseAdmin
        .from('user_role_metadata')
        .select('user_id, metadata')
        .in('user_id', userIds)
        .eq('role_type', 'leaderboard_preferences');

      for (const pref of prefRows ?? []) {
        const metadata = (pref.metadata ?? {}) as Record<string, unknown>;
        const featuredDepartment =
          typeof metadata.featured_department === 'string' ? metadata.featured_department.trim() : '';
        if (featuredDepartment) {
          featuredDomainPrefMap.set(pref.user_id, featuredDepartment);
        }
      }

      const { data: masteryRows } = await supabaseAdmin
        .from('user_domain_mastery')
        .select('user_id, department, mastery_level, mastery_points')
        .in('user_id', userIds)
        .order('mastery_level', { ascending: false })
        .order('mastery_points', { ascending: false })
        .order('department', { ascending: true });

      const masteryByUser = new Map<string, Array<{ department: string; mastery_level: number; mastery_points: number }>>();
      for (const m of masteryRows ?? []) {
        const current = masteryByUser.get(m.user_id) ?? [];
        current.push({
          department: m.department,
          mastery_level: m.mastery_level,
          mastery_points: m.mastery_points ?? 0,
        });
        masteryByUser.set(m.user_id, current);
      }

      for (const uid of userIds) {
        const userMasteryRows = masteryByUser.get(uid) ?? [];
        if (userMasteryRows.length === 0) continue;

        const featuredDepartment = featuredDomainPrefMap.get(uid);
        if (featuredDepartment) {
          const featuredRow = userMasteryRows.find((row) => row.department === featuredDepartment);
          if (featuredRow) {
            masteryTitleMap.set(
              uid,
              formatMasteryTitle(featuredRow.department, featuredRow.mastery_level)
            );
            continue;
          }
        }

        const top = userMasteryRows[0];
        if (top) {
          masteryTitleMap.set(uid, formatMasteryTitle(top.department, top.mastery_level));
        }
      }
    } catch {
      // Non-critical
    }

    const ranked = rows.slice(0, limit).map((r, idx) => ({
      ...r,
      rank: idx + 1,
      badge_count: badgeCountMap.get(r.user_id) ?? 0,
      top_badge_id: topBadgeMap.get(r.user_id) ?? null,
      mastery_title: masteryTitleMap.get(r.user_id) ?? null,
    }));
    return NextResponse.json({ data: ranked });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load leaderboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
