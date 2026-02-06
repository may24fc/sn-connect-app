// Branded Types for Type Safety
export type TaskId = string & { __brand: 'TaskId' };
export type TaskAssignmentId = string & { __brand: 'TaskAssignmentId' };

// Task Status and Priority Types
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

// Task Interfaces
export interface Task {
  id: TaskId;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  category?: string;
  dueDate: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  assignees: TaskAssignee[];
}

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'intern';
  department: string;
  avatarUrl?: string;
  assignedAt: string;
  completedAt?: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  category?: string;
  assigneeIds: string[];
}

export interface TaskFilters {
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  assigneeId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TaskDashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

// Task Priority Configuration
export const TASK_PRIORITY_CONFIG: Record<
  TaskPriority,
  {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'secondary';
    icon: string;
  }
> = {
  low: { label: 'Low', variant: 'success', icon: 'Circle' },
  medium: { label: 'Medium', variant: 'warning', icon: 'Circle' },
  high: { label: 'High', variant: 'error', icon: 'Circle' },
  urgent: { label: 'Urgent', variant: 'error', icon: 'AlertCircle' },
};

// Task Status Configuration
export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  {
    label: string;
    variant: 'secondary' | 'default' | 'success' | 'error';
    icon: string;
  }
> = {
  pending: { label: 'Pending', variant: 'secondary', icon: 'Clock' },
  in_progress: { label: 'In Progress', variant: 'default', icon: 'ArrowRight' },
  completed: { label: 'Completed', variant: 'success', icon: 'Check' },
  blocked: { label: 'Blocked', variant: 'error', icon: 'X' },
};

// Helper function to check if task is overdue
export function isTaskOverdue(dueDate: string, status: TaskStatus): boolean {
  if (status === 'completed') return false;
  const due = new Date(dueDate);
  const today = new Date();
  return due < today;
}

// Helper function to get days until due
export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Helper function to format due date display
export function formatDueDate(dueDate: string): string {
  const days = getDaysUntilDue(dueDate);

  if (days < 0) {
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  } else if (days === 0) {
    return 'Due today';
  } else if (days === 1) {
    return 'Due tomorrow';
  } else if (days <= 7) {
    return `Due in ${days} days`;
  } else {
    return new Date(dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
