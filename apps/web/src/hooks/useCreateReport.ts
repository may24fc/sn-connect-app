import { queryKeys } from '@/lib/query-keys';
import type { ReportCreateInput } from '@/lib/schemas/report.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReportRecord } from './useReports';

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: ReportCreateInput & { employeeId?: string }
    ): Promise<{ data: ReportRecord }> => {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create report');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}
