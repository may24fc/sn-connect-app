import { STALE_TIMES } from '@/lib/query-client';
import { type TaskFilters, queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

/** Assignee/assigner identity returned by the task routes (`attachTaskPeople`). */
export interface TaskPersonRecord {
  id: string;
  name: string | null;
  role: string | null;
  department: string | null;
  position: string | null;
  avatar_url: string | null;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  category:
    | 'launch'
    | 'optimization'
    | 'maintenance'
    | 'research'
    | 'administrative'
    | 'other'
    | null;
  tags: Array<string> | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
  project_id: string | null;
  milestone_id: string | null;
  blocked_reason: string | null;
  project_name?: string | null;
  milestone_name?: string | null;
  assignee_name?: string | null;
  assigner_name?: string | null;
  assignee?: TaskPersonRecord | null;
  assigner?: TaskPersonRecord | null;
}

interface TaskListResponse {
  data: Array<TaskRecord>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface UseTasksOptions {
  enabled?: boolean;
}

export function useTasks(filters: TaskFilters = {}, options: UseTasksOptions = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: async (): Promise<TaskListResponse> => {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);
      if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','));
      if (filters.assigneeId) params.append('assigneeId', filters.assigneeId);
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.milestoneId) params.append('milestoneId', filters.milestoneId);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

      const response = await fetch(`/api/tasks?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      return response.json();
    },
    enabled: options.enabled ?? true,
    staleTime: STALE_TIMES.dynamic,
  });
}
