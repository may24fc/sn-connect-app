'use client';

import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface PendingApprovalsData {
  pendingReports: {
    count: number;
    overdue: number;
    latest: Array<Record<string, unknown>>;
  };
  pendingInvoices: {
    count: number;
    latest: Array<Record<string, unknown>>;
  };
  pendingReviews: {
    count: number;
    latest: Array<Record<string, unknown>>;
  };
  lateEodReports: {
    count: number;
  };
  totalPending: number;
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: queryKeys.pendingApprovals.counts(),
    queryFn: async (): Promise<PendingApprovalsData> => {
      const response = await fetch('/api/dashboard/pending');
      if (!response.ok) throw new Error('Failed to fetch pending approvals');
      const json = await response.json();
      return json.data;
    },
    refetchInterval: 60_000, // Poll every minute
    staleTime: 30_000,
  });
}
