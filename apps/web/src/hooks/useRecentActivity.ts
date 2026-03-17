'use client';

import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface ActivityItem {
  id: string;
  action: string;
  performedBy: string;
  timestamp: string;
  tableName: string;
}

/**
 * Fetches recent audit-log activity for the admin dashboard.
 * @param limit  Number of entries to return (default 10)
 * @param ownOnly  If true, only return activity by the current user
 */
export function useRecentActivity(limit = 10, ownOnly = false) {
  return useQuery({
    queryKey: [...queryKeys.dashboard.activity(), limit, ownOnly],
    queryFn: async (): Promise<ActivityItem[]> => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (ownOnly) params.set('own', 'true');

      const response = await fetch(`/api/audit-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch recent activity');
      const json = await response.json();
      return json.data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
