import type { Task, TaskStatus } from '@hr-portal/ui';

/** Display identity attached to a task by `attachTaskPeople`. */
export interface ApiTaskPerson {
  id: string;
  name: string | null;
  role: string | null;
  department: string | null;
  position: string | null;
  avatar_url: string | null;
}

/** A task as returned by `GET/PATCH /api/tasks/[id]`. */
export interface ApiTaskPayload {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  category: Task['category'] | null;
  tags: Array<string> | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee: ApiTaskPerson | null;
  assigner: ApiTaskPerson | null;
}

/** UI and API share the same status values; kept as a seam for the PATCH payload. */
export function toApiTaskStatus(status: TaskStatus): ApiTaskPayload['status'] {
  return status;
}

/** Maps the API task to the shared `TaskDetailView` model using only real identity data. */
export function toTaskDetailViewModel(apiTask: ApiTaskPayload): Task {
  const { assignee, assigner } = apiTask;

  return {
    id: apiTask.id as Task['id'],
    title: apiTask.title,
    description: apiTask.description || 'No description provided.',
    priority: apiTask.priority,
    status: apiTask.status,
    category: apiTask.category ?? undefined,
    tags: apiTask.tags ?? undefined,
    dueDate: apiTask.due_date,
    createdBy: apiTask.assigned_by,
    createdByName: assigner?.name ?? 'Unknown user',
    createdAt: apiTask.created_at,
    updatedAt: apiTask.updated_at,
    assignees: assignee
      ? [
          {
            id: assignee.id,
            name: assignee.name ?? 'Unknown user',
            role: assignee.role,
            department: assignee.department,
            position: assignee.position,
            avatarUrl: assignee.avatar_url,
            assignedAt: apiTask.created_at,
            ...(apiTask.completed_at ? { completedAt: apiTask.completed_at } : {}),
          },
        ]
      : [],
  };
}
