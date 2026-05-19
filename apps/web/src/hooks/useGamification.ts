import { STALE_TIMES } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface WarRoomInternRow {
  user_id: string;
  full_name: string | null;
  department: string | null;
  project_count: number;
  avg_progress: number;
  on_track: number;
  at_risk: number;
  overdue: number;
  total_points: number;
  current_tier: 'bronze' | 'silver' | 'gold' | 'production_ready';
  current_streak: number;
}

export interface WarRoomDeptRow {
  department: string;
  on_track: number;
  at_risk: number;
  overdue: number;
  intern_count: number;
}

export interface WarRoomTotals {
  projects: number;
  on_track: number;
  at_risk: number;
  overdue: number;
  points: number;
}

export interface WarRoomOverview {
  interns: WarRoomInternRow[];
  departments: WarRoomDeptRow[];
  totals: WarRoomTotals;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export function useWarRoomOverview() {
  return useQuery({
    queryKey: queryKeys.warRoom.overview(),
    queryFn: () => fetchJson<{ data: WarRoomOverview }>('/api/admin/war-room/overview'),
    staleTime: STALE_TIMES.dynamic,
    select: (r) => r.data,
  });
}

export type LeaderboardScope = 'interns' | 'employees' | 'all';
export type LeaderboardPeriod = 'all' | 'month';

export interface LeaderboardRow {
  rank: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  role: string;
  points_total: number;
  points_period: number;
  current_tier: 'bronze' | 'silver' | 'gold' | 'production_ready';
  current_streak: number;
  longest_streak: number;
  last_activity_at: string | null;
}

export function useLeaderboard(scope: LeaderboardScope = 'interns', period: LeaderboardPeriod = 'all') {
  return useQuery({
    queryKey: queryKeys.leaderboard.list(scope, period),
    queryFn: () =>
      fetchJson<{ data: LeaderboardRow[] }>(
        `/api/leaderboard?scope=${scope}&period=${period}&limit=50`
      ),
    staleTime: STALE_TIMES.dynamic,
    select: (r) => r.data,
  });
}
