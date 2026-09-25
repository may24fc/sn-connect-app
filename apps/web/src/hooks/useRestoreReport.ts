import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useRestoreReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const response = await fetch(`/api/reports/${id}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to restore report' }));
        throw new Error(error.error || 'Failed to restore report');
      }

      return response.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reports.all });
      const previousReports = queryClient.getQueriesData<unknown>({ queryKey: queryKeys.reports.all });
      // A restored record no longer belongs in an archived result set. The subsequent
      // refetch places it correctly in active lists without guessing pagination/order.
      queryClient.setQueriesData<{ data: Array<{ id: string }> }>(
        { queryKey: queryKeys.reports.lists() },
        (old) => (old ? { ...old, data: old.data.filter((report) => report.id !== id) } : old)
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
