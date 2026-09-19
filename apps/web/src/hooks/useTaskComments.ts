import { STALE_TIMES } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  commenter_name: string | null;
}

export function useTaskComments(taskId?: string | null, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.comments(taskId ?? 'unknown'),
    queryFn: async (): Promise<{ data: Array<TaskComment> }> => {
      if (!taskId) {
        return { data: [] };
      }

      const response = await fetch(`/api/tasks/${taskId}/comments`);

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to fetch task comments' }));
        throw new Error(error.error || 'Failed to fetch task comments');
      }

      return response.json();
    },
    enabled: (options.enabled ?? true) && Boolean(taskId),
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useCreateTaskComment(taskId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { content: string }): Promise<{ data: TaskComment }> => {
      if (!taskId) {
        throw new Error('Task ID is required to add a comment');
      }

      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to post task comment' }));
        throw new Error(error.error || 'Failed to post task comment');
      }

      return response.json();
    },
    onSuccess: () => {
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.comments(taskId) });
      }
    },
  });
}
