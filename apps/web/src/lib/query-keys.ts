/**
 * Centralized query key factory for type-safe cache management.
 *
 * This pattern provides:
 * - Type-safe query keys
 * - Consistent key structure across the app
 * - Easy cache invalidation (invalidate at any level of specificity)
 *
 * Usage:
 * - queryKeys.employees.all - invalidates ALL employee-related queries
 * - queryKeys.employees.lists() - invalidates all employee list queries
 * - queryKeys.employees.list(filters) - invalidates specific filtered list
 * - queryKeys.employees.detail(id) - invalidates specific employee detail
 */

// Filter type definitions
export interface EmployeeFilters {
  search?: string;
  department?: string;
  status?: 'active' | 'on_leave' | 'probation' | 'terminated';
  page?: number;
  pageSize?: number;
}

export interface DepartmentFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TaskFilters {
  search?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigneeId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  page?: number;
  pageSize?: number;
}

export interface DocumentFilters {
  search?: string;
  employeeId?: string;
  documentType?: string;
  isConfidential?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
  department?: string;
  metric?: string;
}

export const queryKeys = {
  // Employees
  employees: {
    all: ['employees'] as const,
    lists: () => [...queryKeys.employees.all, 'list'] as const,
    list: (filters: EmployeeFilters) =>
      [...queryKeys.employees.lists(), filters] as const,
    details: () => [...queryKeys.employees.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
  },

  // Departments
  departments: {
    all: ['departments'] as const,
    lists: () => [...queryKeys.departments.all, 'list'] as const,
    list: (filters: DepartmentFilters) =>
      [...queryKeys.departments.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.departments.all, 'detail', id] as const,
  },

  // Documents
  documents: {
    all: ['documents'] as const,
    lists: () => [...queryKeys.documents.all, 'list'] as const,
    list: (filters: DocumentFilters) =>
      [...queryKeys.documents.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.documents.all, 'detail', id] as const,
  },

  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: TaskFilters) =>
      [...queryKeys.tasks.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.tasks.all, 'detail', id] as const,
  },

  // Reports
  reports: {
    all: ['reports'] as const,
    weekly: (weekId: string) =>
      [...queryKeys.reports.all, 'weekly', weekId] as const,
    analytics: (params: AnalyticsParams) =>
      [...queryKeys.reports.all, 'analytics', params] as const,
  },

  // AI Knowledge
  aiKnowledge: {
    all: ['ai-knowledge'] as const,
    sources: () => [...queryKeys.aiKnowledge.all, 'sources'] as const,
    source: (id: string) => [...queryKeys.aiKnowledge.sources(), id] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    activity: () => [...queryKeys.dashboard.all, 'activity'] as const,
  },

  // Performance
  performance: {
    all: ['performance'] as const,
    reviews: () => [...queryKeys.performance.all, 'reviews'] as const,
    review: (id: string) => [...queryKeys.performance.reviews(), id] as const,
    cycles: () => [...queryKeys.performance.all, 'cycles'] as const,
    cycle: (id: string) => [...queryKeys.performance.cycles(), id] as const,
    kpis: () => [...queryKeys.performance.all, 'kpis'] as const,
    okrs: () => [...queryKeys.performance.all, 'okrs'] as const,
  },

  // Payroll
  payroll: {
    all: ['payroll'] as const,
    approvals: () => [...queryKeys.payroll.all, 'approvals'] as const,
    approval: (id: string) => [...queryKeys.payroll.approvals(), id] as const,
    history: () => [...queryKeys.payroll.all, 'history'] as const,
  },

  // Onboarding
  onboarding: {
    all: ['onboarding'] as const,
    progress: () => [...queryKeys.onboarding.all, 'progress'] as const,
    tasks: () => [...queryKeys.onboarding.all, 'tasks'] as const,
  },

  // Announcements
  announcements: {
    all: ['announcements'] as const,
    list: () => [...queryKeys.announcements.all, 'list'] as const,
    detail: (id: string) =>
      [...queryKeys.announcements.all, 'detail', id] as const,
  },
} as const;

// Type helpers for query key extraction
export type QueryKeys = typeof queryKeys;
