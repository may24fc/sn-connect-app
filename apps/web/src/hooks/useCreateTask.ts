import { queryKeys } from '@/lib/query-keys';
import type { TaskCreateInput } from '@/lib/schemas/task.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TaskRecord } from './useTasks';

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TaskCreateInput): Promise<{ data: TaskRecord }> => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create task');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}
