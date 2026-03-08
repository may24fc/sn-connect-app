'use client';

import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface DashboardStatsData {
  totalEmployees: number;
  activeInterns: number;
  reviewsDue: number;
  recentHires: number;
}

/**
 * Fetches aggregate stats for the admin dashboard stat cards.
 * Returns total employees, active interns, reviews due, and recent hires.
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async (): Promise<DashboardStatsData> => {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      const json = await response.json();
      return json.data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
