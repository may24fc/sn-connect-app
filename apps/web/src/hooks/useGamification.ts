import { STALE_TIMES } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface AdminProjectsInternRow {
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

export interface AdminProjectsDeptRow {
  department: string;
  on_track: number;
  at_risk: number;
  overdue: number;
  intern_count: number;
}

export interface AdminProjectsTotals {
  projects: number;
  on_track: number;
  at_risk: number;
  overdue: number;
  points: number;
}

export interface AdminProjectsOverview {
  interns: AdminProjectsInternRow[];
  departments: AdminProjectsDeptRow[];
  totals: AdminProjectsTotals;
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

export function useAdminProjectsOverview() {
  return useQuery({
    queryKey: queryKeys.adminProjects.overview(),
    queryFn: () => fetchJson<{ data: AdminProjectsOverview }>('/api/admin/projects/overview'),
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
  badge_count: number;
  top_badge_id: string | null;
  mastery_title: string | null;
}

export function useLeaderboard(
  scope: LeaderboardScope = 'interns',
  period: LeaderboardPeriod = 'all'
) {
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

// ── Domain Mastery ───────────────────────────────────────────────────────────

export interface DomainMasteryRow {
  department: string;
  mastery_points: number;
  mastery_level: number;
  updated_at: string;
}

export function useUserMastery(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.gamification.mastery(userId ?? ''),
    queryFn: () => fetchJson<{ data: DomainMasteryRow[] }>(`/api/users/${userId}/mastery`),
    enabled: Boolean(userId),
    staleTime: STALE_TIMES.dynamic,
    select: (r) => r.data,
  });
}

// ── Badges ───────────────────────────────────────────────────────────────────

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  department: string | null;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface UserBadgeRow {
  id: string;
  badge_id: string;
  earned_at: string;
  source_metadata: Record<string, unknown>;
  badge_definitions: BadgeDefinition | null;
}

export function useUserBadges(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.gamification.badges(userId ?? ''),
    queryFn: () => fetchJson<{ data: UserBadgeRow[] }>(`/api/users/${userId}/badges`),
    enabled: Boolean(userId),
    staleTime: STALE_TIMES.dynamic,
    select: (r) => r.data,
  });
}

// ── Featured Mastery Preference ─────────────────────────────────────────────

export interface FeaturedMasteryPreference {
  featured_department: string | null;
}

export function useFeaturedMasteryPreference(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.gamification.featuredMastery(userId ?? ''),
    queryFn: () =>
      fetchJson<{ data: FeaturedMasteryPreference }>(`/api/users/${userId}/leaderboard-preferences`),
    enabled: Boolean(userId),
    staleTime: STALE_TIMES.dynamic,
    select: (r) => r.data,
  });
}

export function useUpdateFeaturedMasteryPreference(userId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (featuredDepartment: string | null) => {
      if (!userId) throw new Error('Missing user id');

      const res = await fetch(`/api/users/${userId}/leaderboard-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured_department: featuredDepartment }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      return (await res.json()) as { data: FeaturedMasteryPreference };
    },
    onSuccess: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.gamification.featuredMastery(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.all });
    },
  });
}
