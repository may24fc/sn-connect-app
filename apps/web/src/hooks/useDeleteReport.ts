import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const response = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete report' }));
        throw new Error(error.error || 'Failed to delete report');
      }

      return response.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reports.all });
      const previousReports = queryClient.getQueriesData<unknown>({ queryKey: queryKeys.reports.all });
      queryClient.setQueriesData<{ data: Array<{ id: string }>; pagination?: { total: number } }>(
        { queryKey: queryKeys.reports.lists() },
        (old) =>
          old
            ? {
                ...old,
                data: old.data.filter((report) => report.id !== id),
                ...(old.pagination
                  ? { pagination: { ...old.pagination, total: Math.max(0, old.pagination.total - 1) } }
                  : {}),
              }
            : old
      );
      return { previousReports };
    },
    onError: (_error, _id, context) => {
      context?.previousReports.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      queryClient.removeQueries({ queryKey: queryKeys.reports.detail(id) });
    },
  });
}
