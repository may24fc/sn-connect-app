import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';
import type { TaskRecord } from './useTasks';

export function useTask(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id || ''),
    queryFn: async (): Promise<{ data: TaskRecord }> => {
      if (!id) throw new Error('Task ID is required');

      const response = await fetch(`/api/tasks/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch task');
      }

      return response.json();
    },
    enabled: !!id,
  });
}
