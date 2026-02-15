import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';
import type { ReportRecord } from './useReports';

export function useReport(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.reports.detail(id || ''),
    queryFn: async (): Promise<{ data: ReportRecord }> => {
      if (!id) throw new Error('Report ID is required');

      const response = await fetch(`/api/reports/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      return response.json();
    },
    enabled: !!id,
  });
}
