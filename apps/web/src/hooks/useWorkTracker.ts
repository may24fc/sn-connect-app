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
      milestoneId: string | null;
      milestoneName: string | null;
      blockedReason: string | null;
    };

export interface PersonWorkSummary {
  userId: string;
  name: string;
  department: string | null;
  role: string | null;
  avatarUrl: string | null;
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

export interface ProjectWorkSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  health: string;
  progressPct: number;
  dueDate: string | null;
  leadUserId: string;
  leadName: string | null;
  leadAvatarUrl: string | null;
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  overdueTasks: number;
}

export interface WorkTrackerResponse {
  scope: WorkTrackerScope;
  days: WorkTrackerRange;
  canAssignTasks: boolean;
  usageAvailable: boolean;
  person?: PersonWorkSummary;
  people?: Array<PersonWorkSummary>;
  projects?: Array<ProjectWorkSummary>;
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
