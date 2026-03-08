'use client';

import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface SuperAdminStatsData {
  totalUsers: number;
  activeUsers: number;
  auditLogsCount: number;
  userRoleDistribution: Array<{
    role: string;
    count: number;
    percentage: number;
  }>;
  recentAuditLogs: Array<{
    id: string;
    userId: string | null;
    action: string;
    details: string;
    timestamp: string;
  }>;
}

/**
 * Fetches aggregate stats for the super-admin dashboard.
 * Returns total users, audit logs count, role distribution, and recent audit logs.
 */
export function useSuperAdminStats() {
  return useQuery({
    queryKey: [...queryKeys.dashboard.all, 'super-admin-stats'] as const,
    queryFn: async (): Promise<SuperAdminStatsData> => {
      const response = await fetch('/api/dashboard/super-admin-stats');
      if (!response.ok) throw new Error('Failed to fetch super-admin stats');
      const json = await response.json();
      return json.data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
