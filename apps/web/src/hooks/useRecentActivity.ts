'use client';

import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface ActivityItem {
  id: string;
  action: string;
  performedBy: string;
  timestamp: string;
  tableName: string;
  categoryLabel: string;
  category: string;
}

export type ActivityScope = 'admin' | 'super_admin';

interface UseRecentActivityOptions {
  ownOnly?: boolean;
  scope: ActivityScope;
}

/**
 * Fetches recent audit-log activity for the admin dashboard.
 * @param limit  Number of entries to return (default 10)
 * @param options.scope  Activity feed scope for admin or super-admin surfaces
 * @param options.ownOnly  If true, only return activity by the current user
 */
export function useRecentActivity(limit = 10, options: UseRecentActivityOptions) {
  const { ownOnly = false, scope } = options;

  return useQuery({
    queryKey: [...queryKeys.dashboard.activity(), limit, scope, ownOnly],
    queryFn: async (): Promise<ActivityItem[]> => {
      const params = new URLSearchParams({ limit: String(limit), scope });
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
