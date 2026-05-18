import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaderboard?scope=all|interns&period=all|month&limit=50
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
    const scope = (url.searchParams.get('scope') ?? 'interns') as 'interns' | 'all';
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
          },
        ];
      }
    );

    rows.sort((a, b) => {
      const va = period === 'month' ? a.points_period : a.points_total;
      const vb = period === 'month' ? b.points_period : b.points_total;
      return vb - va;
    });

    const ranked = rows.slice(0, limit).map((r, idx) => ({ ...r, rank: idx + 1 }));
    return NextResponse.json({ data: ranked });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load leaderboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
