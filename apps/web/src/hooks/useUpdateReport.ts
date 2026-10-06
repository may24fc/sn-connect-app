import { toApiError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';
import type { ReportCreateInput } from '@/lib/schemas/report.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReportRecord } from './useReports';

interface UpdateReportPayload {
  id: string;
  payload: ReportCreateInput;
}

export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: UpdateReportPayload): Promise<{ data: ReportRecord }> => {
      const response = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw await toApiError(response, 'Failed to update report');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.detail(variables.id) });
    },
  });
}
