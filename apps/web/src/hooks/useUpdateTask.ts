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
      const previousTasks = queryClient.getQueryData(queryKeys.tasks.all);
      const previousTask = queryClient.getQueryData(queryKeys.tasks.detail(taskId));

      // Optimistically update detail view
      queryClient.setQueryData(queryKeys.tasks.detail(taskId), (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: { ...old.data, ...payload, updated_at: new Date().toISOString() },
        };
      });

      // Optimistically update list views
      queryClient.setQueriesData({ queryKey: queryKeys.tasks.all }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((task: TaskRecord) =>
            task.id === taskId
              ? { ...task, ...payload, updated_at: new Date().toISOString() }
              : task
          ),
        };
      });

      return { previousTasks, previousTask };
    },
    onError: (err, payload, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previousTasks);
      }
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
