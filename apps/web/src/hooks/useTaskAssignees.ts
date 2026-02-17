import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface TaskAssigneeOption {
  id: string;
  role: 'employee' | 'intern';
  name: string;
  email: string | null;
}

interface TaskAssigneesResponse {
  data: Array<TaskAssigneeOption>;
}

export function useTaskAssignees(enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.tasks.all, 'assignees'] as const,
    queryFn: async (): Promise<TaskAssigneesResponse> => {
      const response = await fetch('/api/tasks/assignees');

      if (!response.ok) {
        throw new Error('Failed to fetch task assignees');
      }

      return response.json();
    },
    enabled,
  });
}
