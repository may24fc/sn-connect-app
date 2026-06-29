'use client';

import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface ExpenseAnalyticsFilters {
  period?: 'week' | 'month';
  departmentId?: string;
  processingStatus?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseAnalyticsData {
  period: 'week' | 'month';
  startDate: string;
  endDate: string;
  totalEntries: number;
  totalSpendAud: number;
  averageSpendAudPerEntry: number;
  trend: Array<{
    periodStart: string;
    label: string;
    totalSpendAud: number;
    entryCount: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
    totalSpendAud: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    totalSpendAud: number;
  }>;
  departmentBreakdown: Array<{
    departmentId: string;
    departmentName: string;
    count: number;
    totalSpendAud: number;
  }>;
}

export function useExpenseAnalytics(filters: ExpenseAnalyticsFilters = {}) {
  const resolved: ExpenseAnalyticsFilters = {
    period: filters.period || 'week',
  };

  if (filters.departmentId) resolved.departmentId = filters.departmentId;
  if (filters.processingStatus) resolved.processingStatus = filters.processingStatus;
  if (filters.startDate) resolved.startDate = filters.startDate;
  if (filters.endDate) resolved.endDate = filters.endDate;

  return useQuery({
    queryKey: queryKeys.dashboard.analytics(resolved),
    queryFn: async (): Promise<ExpenseAnalyticsData> => {
      const params = new URLSearchParams();
      params.set('period', resolved.period || 'week');
      if (resolved.departmentId) params.set('departmentId', resolved.departmentId);
      if (resolved.processingStatus) params.set('processingStatus', resolved.processingStatus);
      if (resolved.startDate) params.set('startDate', resolved.startDate);
      if (resolved.endDate) params.set('endDate', resolved.endDate);

      const response = await fetch(`/api/dashboard/analytics?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch expense analytics');
      }

      const json = await response.json();
      return json.data as ExpenseAnalyticsData;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
