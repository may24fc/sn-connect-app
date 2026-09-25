import { queryKeys } from '@/lib/query-keys';
import type { TaskUpdateInput } from '@/lib/schemas/task.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TaskRecord } from './useTasks';

export function useUpdateTask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TaskUpdateInput): Promise<{ data: TaskRecord }> => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update task');
      }

      return response.json();
    },
    // Optimistic update for instant UI feedback
    onMutate: async (payload) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) });

      // Snapshot previous values
      const previousTaskLists = queryClient.getQueriesData({
        queryKey: queryKeys.tasks.lists(),
      });
      const previousTask = queryClient.getQueryData(queryKeys.tasks.detail(taskId));

      // Optimistically update detail view
      queryClient.setQueryData(queryKeys.tasks.detail(taskId), (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: { ...old.data, ...payload, updated_at: new Date().toISOString() },
        };
      });

      // Optimistically update list views (use .lists() to avoid matching detail queries)
      queryClient.setQueriesData({ queryKey: queryKeys.tasks.lists() }, (old: any) => {
        if (!old?.data || !Array.isArray(old.data)) return old;
        return {
          ...old,
          data: old.data.map((task: TaskRecord) =>
            task.id === taskId
              ? { ...task, ...payload, updated_at: new Date().toISOString() }
              : task
          ),
        };
      });

      return { previousTaskLists, previousTask };
    },
    onError: (_err, _payload, context) => {
      // Rollback on error
      context?.previousTaskLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(taskId), context.previousTask);
      }
    },
    onSettled: () => {
      // Always refetch after mutation completes
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
    },
  });
}
