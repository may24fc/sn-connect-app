import { STALE_TIMES } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export type WorkTrackerRange = 7 | 30 | 90;
export type WorkTrackerScope = 'mine' | 'team';

export type WorkItem =
  | {
      source: 'project';
      id: string;
      title: string;
      description: string | null;
      status: string;
      health: string | null;
      progressPct: number;
      dueDate: string | null;
      updatedAt: string;
      href: string;
      projectRole: 'lead' | 'contributor';
    }
  | {
      source: 'task';
      id: string;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      dueDate: string | null;
      updatedAt: string;
      href: string;
      projectId: string | null;
      projectName: string | null;
    };

export interface PersonWorkSummary {
  userId: string;
  name: string;
  department: string;
  role: string;
  activeProjectCount: number;
  averageProjectProgress: number;
  openTaskCount: number;
  completedTaskCount: number;
  taskCompletionRate: number;
  blockedCount: number;
  overdueCount: number;
  lastActiveAt: string | null;
  activeDays: number;
  sessionCount: number;
  items: Array<WorkItem>;
}

export interface WorkTrackerResponse {
  scope: WorkTrackerScope;
  days: WorkTrackerRange;
  canAssignTasks: boolean;
  person?: PersonWorkSummary;
  people?: Array<PersonWorkSummary>;
  unassignedTaskCount?: number;
}

export function useWorkTracker(scope: WorkTrackerScope, days: WorkTrackerRange) {
  return useQuery({
    queryKey: queryKeys.workTracker.view(scope, days),
    queryFn: async (): Promise<WorkTrackerResponse> => {
      const response = await fetch(`/api/work-tracker?scope=${scope}&days=${days}`);
      if (!response.ok) throw new Error('Failed to load work tracker');
      return response.json();
    },
    staleTime: STALE_TIMES.dynamic,
  });
}
