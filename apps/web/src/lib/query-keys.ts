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
  search?: string | undefined;
  userId?: string | undefined;
  department?: string | undefined;
  status?: 'active' | 'on_leave' | 'probation' | 'terminated' | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export interface DepartmentFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface DivisionFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TaskFilters {
  search?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigneeId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

export interface ProjectFilters {
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  health?: 'on_track' | 'at_risk' | 'overdue';
  leadUserId?: string;
  mineOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export type ProjectPoolStatus = 'claimable' | 'archived';

export interface ReportFilters {
  search?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  archived?: 'exclude' | 'only' | 'include';
  reportType?: string;
  employeeId?: string;
  groupBy?: 'report_group' | 'hierarchy';
  parentReportId?: string;
  periodStart?: string;
  periodEnd?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}

export interface InvoiceFilters {
  status?: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';
  employeeId?: string;
  page?: number;
  pageSize?: number;
}

export interface DocumentFilters {
  search?: string | undefined;
  employeeId?: string | undefined;
  documentType?: string | undefined;
  isConfidential?: boolean | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export interface AnnouncementFilters {
  search?: string;
  status?: 'draft' | 'scheduled' | 'published' | 'expired' | 'archived';
  category?: string;
  categories?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  readStatus?: string;
  readStatuses?: string[];
  authorId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ResourceFilters {
  search?: string;
  status?: 'draft' | 'published' | 'archived';
  category?:
    | 'onboarding'
    | 'training'
    | 'policies'
    | 'benefits'
    | 'tools'
    | 'culture'
    | 'department_specific'
    | 'forms_templates'
    | 'performance'
    | 'emergency';
  resourceType?: 'video' | 'document' | 'image' | 'link' | 'presentation' | 'interactive';
  tags?: Array<string>;
  authorId?: string;
  isFeatured?: boolean;
  isPinned?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'published_at' | 'view_count' | 'title';
  sortOrder?: 'asc' | 'desc';
  folderId?: string;
}

export interface ResourceFeedFilters {
  search?: string;
  category?: string;
  resourceType?: string;
  tags?: Array<string>;
  page?: number;
  pageSize?: number;
}

export interface CollectionFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AISourceFilters {
  search?: string;
  status?: 'scanning' | 'chunking' | 'indexing' | 'ready' | 'error';
  accessLevel?: 'all' | 'admin';
  page?: number;
  pageSize?: number;
}

export interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
  department?: string;
  metric?: string;
}

export interface OnboardingProfileFilters {
  search?: string;
  status?: 'completed' | 'in_progress';
  role?: 'employee' | 'intern';
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface InternshipFilters {
  search?: string;
  status?: 'active' | 'completed' | 'terminated' | 'converted';
  school?: string;
  supervisorId?: string;
  employeeId?: string;
  page?: number;
  pageSize?: number;
}

export interface DirectoryFilters {
  search?: string;
  role?: string;
  department?: string;
  division?: string;
  status?: string;
  employmentType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface MilestoneFilters {
  days?: number;
  type?: 'birthday' | 'anniversary' | 'all';
}

export interface NotificationFilters {
  page?: number;
  pageSize?: number;
  isRead?: boolean | 'all';
  type?: string;
}

export interface CompanyCalendarFilters {
  start?: string;
  end?: string;
  limit?: number;
}

export interface JobFilters {
  search?: string;
  employmentType?: 'full-time' | 'part-time' | 'internship' | 'contract';
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ApplicationFiltersQuery {
  search?: string;
  status?: 'pending' | 'reviewed' | 'shortlisted' | 'interview' | 'rejected' | 'approved' | 'hired';
  jobPostingId?: string;
  sortBy?: 'created_at' | 'ai_match_score';
  minScore?: number;
  maxScore?: number;
  page?: number;
  pageSize?: number;
}

export interface TicketFilters {
  search?: string;
  team?: 'hr' | 'it';
  status?:
    | 'new'
    | 'triaged'
    | 'assigned'
    | 'in_progress'
    | 'waiting_on_user'
    | 'resolved'
    | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scope?: 'submitter' | 'assigned' | 'triage';
  page?: number;
  pageSize?: number;
}

export interface CrmSfoFilters {
  search?: string;
  status?: 'new' | 'for_follow_up' | 'closed' | 'lost';
  platform?: 'Meta' | 'Google Ads';
}

export interface CrmTechFilters {
  search?: string;
  stage?:
    | 'initial_contact'
    | 'requirements_gathering'
    | 'proposal_sent'
    | 'under_review'
    | 'closed_won'
    | 'closed_lost';
}

export const queryKeys = {
  // Employees
  employees: {
    all: ['employees'] as const,
    lists: () => [...queryKeys.employees.all, 'list'] as const,
    list: (filters: EmployeeFilters) => [...queryKeys.employees.lists(), filters] as const,
    details: () => [...queryKeys.employees.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
  },

  // Departments
  departments: {
    all: ['departments'] as const,
    lists: () => [...queryKeys.departments.all, 'list'] as const,
    list: (filters: DepartmentFilters) => [...queryKeys.departments.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.departments.all, 'detail', id] as const,
  },

  divisions: {
    all: ['divisions'] as const,
    lists: () => [...queryKeys.divisions.all, 'list'] as const,
    list: (filters: DivisionFilters) => [...queryKeys.divisions.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.divisions.all, 'detail', id] as const,
  },

  // Documents
  documents: {
    all: ['documents'] as const,
    lists: () => [...queryKeys.documents.all, 'list'] as const,
    list: (filters: DocumentFilters) => [...queryKeys.documents.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.documents.all, 'detail', id] as const,
  },

  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: TaskFilters) => [...queryKeys.tasks.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.tasks.all, 'detail', id] as const,
    proofs: (taskId: string) => [...queryKeys.tasks.all, 'proofs', taskId] as const,
  },

  // Reports
  reports: {
    all: ['reports'] as const,
    lists: () => [...queryKeys.reports.all, 'list'] as const,
    list: (filters: ReportFilters) => [...queryKeys.reports.lists(), filters] as const,
    details: () => [...queryKeys.reports.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.reports.details(), id] as const,
    weekly: (weekId: string) => [...queryKeys.reports.all, 'weekly', weekId] as const,
    analytics: (params: AnalyticsParams) =>
      [...queryKeys.reports.all, 'analytics', params] as const,
  },

  // AI Knowledge
  aiKnowledge: {
    all: ['ai-knowledge'] as const,
    sources: () => [...queryKeys.aiKnowledge.all, 'sources'] as const,
    sourcesList: (filters: AISourceFilters) =>
      [...queryKeys.aiKnowledge.sources(), 'list', filters] as const,
    source: (id: string) => [...queryKeys.aiKnowledge.sources(), id] as const,
    suggestions: () => [...queryKeys.aiKnowledge.all, 'suggestions'] as const,
    chat: () => [...queryKeys.aiKnowledge.all, 'chat'] as const,
    conversationsList: () => [...queryKeys.aiKnowledge.all, 'conversations'] as const,
    conversations: (limit: number, offset: number) =>
      [...queryKeys.aiKnowledge.conversationsList(), limit, offset] as const,
    conversationMessages: (id: string) =>
      [...queryKeys.aiKnowledge.conversationsList(), id, 'messages'] as const,
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
    evaluationCadence: () => [...queryKeys.performance.all, 'evaluation-cadence'] as const,
    kpis: () => [...queryKeys.performance.all, 'kpis'] as const,
    kpiEvidence: (kpiId: string) => [...queryKeys.performance.all, 'kpi-evidence', kpiId] as const,
    okrs: () => [...queryKeys.performance.all, 'okrs'] as const,
    okrTargetEvidence: (okrTargetId: string) =>
      [...queryKeys.performance.all, 'okr-target-evidence', okrTargetId] as const,
    okrTargets: (okrId?: string) =>
      [...queryKeys.performance.all, 'okr-targets', okrId || 'all'] as const,
    individual: (employeeId: string) =>
      [...queryKeys.performance.all, 'individual', employeeId] as const,
    team: () => [...queryKeys.performance.all, 'team'] as const,
  },

  // Payroll
  payroll: {
    all: ['payroll'] as const,
    lists: () => [...queryKeys.payroll.all, 'list'] as const,
    list: (filters: InvoiceFilters) => [...queryKeys.payroll.lists(), filters] as const,
    details: () => [...queryKeys.payroll.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.payroll.details(), id] as const,
    approvals: () => [...queryKeys.payroll.all, 'approvals'] as const,
    approval: (id: string) => [...queryKeys.payroll.approvals(), id] as const,
    history: () => [...queryKeys.payroll.all, 'history'] as const,
  },

  // Onboarding
  onboarding: {
    all: ['onboarding'] as const,
    progress: () => [...queryKeys.onboarding.all, 'progress'] as const,
    tasks: () => [...queryKeys.onboarding.all, 'tasks'] as const,
    checklist: (employeeId: string) =>
      [...queryKeys.onboarding.all, 'checklist', employeeId] as const,
    template: (scope: 'employee' | 'intern') =>
      [...queryKeys.onboarding.all, 'template', scope] as const,
    profile: () => [...queryKeys.onboarding.all, 'profile'] as const,
    pendingApprovals: (role?: 'employee' | 'intern') =>
      [...queryKeys.onboarding.all, 'pending-approvals', role ?? 'all'] as const,
    profiles: {
      all: () => [...queryKeys.onboarding.all, 'profiles'] as const,
      list: (filters: OnboardingProfileFilters) =>
        [...queryKeys.onboarding.profiles.all(), 'list', filters] as const,
      detail: (id: string) => [...queryKeys.onboarding.profiles.all(), 'detail', id] as const,
    },
    documents: {
      all: () => [...queryKeys.onboarding.all, 'documents'] as const,
      list: (profileId?: string) =>
        [...queryKeys.onboarding.documents.all(), 'list', profileId ?? 'self'] as const,
    },
    wizard: () => [...queryKeys.onboarding.all, 'wizard'] as const,
  },

  offboarding: {
    all: ['offboarding'] as const,
    list: (employeeId?: string) =>
      [...queryKeys.offboarding.all, 'list', employeeId ?? 'all'] as const,
    me: () => [...queryKeys.offboarding.all, 'me'] as const,
    tasks: (offboardingId: string) =>
      [...queryKeys.offboarding.all, 'tasks', offboardingId] as const,
    template: () => [...queryKeys.offboarding.all, 'template', 'default'] as const,
  },

  // Probation
  probation: {
    all: ['probation'] as const,
    list: () => [...queryKeys.probation.all, 'list'] as const,
    me: () => [...queryKeys.probation.all, 'me'] as const,
  },

  internships: {
    all: ['internships'] as const,
    lists: () => [...queryKeys.internships.all, 'list'] as const,
    list: (filters: InternshipFilters) => [...queryKeys.internships.lists(), filters] as const,
    details: () => [...queryKeys.internships.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.internships.details(), id] as const,
    logs: (id: string) => [...queryKeys.internships.all, 'logs', id] as const,
  },

  // Announcements
  announcements: {
    all: ['announcements'] as const,
    lists: () => [...queryKeys.announcements.all, 'list'] as const,
    list: (filters: AnnouncementFilters) => [...queryKeys.announcements.lists(), filters] as const,
    details: () => [...queryKeys.announcements.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.announcements.details(), id] as const,
    drafts: () => [...queryKeys.announcements.all, 'drafts'] as const,
    scheduled: () => [...queryKeys.announcements.all, 'scheduled'] as const,
    feed: (filters: AnnouncementFilters) =>
      [...queryKeys.announcements.all, 'feed', filters] as const,
    starred: () => [...queryKeys.announcements.all, 'starred'] as const,
    analytics: (id: string) => [...queryKeys.announcements.all, 'analytics', id] as const,
    attachments: (id: string) => [...queryKeys.announcements.all, 'attachments', id] as const,
    comments: (id: string) => [...queryKeys.announcements.all, 'comments', id] as const,
  },

  resources: {
    all: ['resources'] as const,
    lists: () => [...queryKeys.resources.all, 'list'] as const,
    list: (filters: ResourceFilters) => [...queryKeys.resources.lists(), filters] as const,
    details: () => [...queryKeys.resources.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.resources.details(), id] as const,
    feed: (filters: ResourceFeedFilters) => [...queryKeys.resources.all, 'feed', filters] as const,
    featured: () => [...queryKeys.resources.all, 'featured'] as const,
    recent: () => [...queryKeys.resources.all, 'recent'] as const,
    bookmarks: () => [...queryKeys.resources.all, 'bookmarks'] as const,
    search: (query: string, filters?: Record<string, unknown>) =>
      [...queryKeys.resources.all, 'search', query, filters] as const,
    category: (category: string) => [...queryKeys.resources.all, 'category', category] as const,
    analytics: (id: string) => [...queryKeys.resources.all, 'analytics', id] as const,
    pending: () => [...queryKeys.resources.all, 'pending'] as const,
  },

  collections: {
    all: ['collections'] as const,
    lists: () => [...queryKeys.collections.all, 'list'] as const,
    list: (filters: CollectionFilters) => [...queryKeys.collections.lists(), filters] as const,
    details: () => [...queryKeys.collections.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.collections.details(), id] as const,
    resources: (id: string) => [...queryKeys.collections.all, 'resources', id] as const,
  },

  // Directory
  directory: {
    all: ['directory'] as const,
    lists: () => [...queryKeys.directory.all, 'list'] as const,
    list: (filters: DirectoryFilters) => [...queryKeys.directory.lists(), filters] as const,
    details: () => [...queryKeys.directory.all, 'detail'] as const,
    detail: (userId: string) => [...queryKeys.directory.details(), userId] as const,
    export: (filters: DirectoryFilters) => [...queryKeys.directory.all, 'export', filters] as const,
  },

  // Profile Change Requests
  profileChangeRequests: {
    all: ['profile-change-requests'] as const,
    lists: () => [...queryKeys.profileChangeRequests.all, 'list'] as const,
    list: (filters: { employeeId?: string; status?: string; page?: number }) =>
      [...queryKeys.profileChangeRequests.lists(), filters] as const,
    pending: () => [...queryKeys.profileChangeRequests.all, 'pending'] as const,
  },

  // Milestones (Birthdays & Anniversaries)
  milestones: {
    all: ['milestones'] as const,
    lists: () => [...queryKeys.milestones.all, 'list'] as const,
    list: (filters: MilestoneFilters) => [...queryKeys.milestones.lists(), filters] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (filters: NotificationFilters) => [...queryKeys.notifications.lists(), filters] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
    detail: (id: string) => [...queryKeys.notifications.all, 'detail', id] as const,
  },

  // Pending Approvals (Dashboard)
  pendingApprovals: {
    all: ['pending-approvals'] as const,
    counts: () => [...queryKeys.pendingApprovals.all, 'counts'] as const,
  },

  // Job Postings
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    list: (filters: JobFilters) => [...queryKeys.jobs.lists(), filters] as const,
    archived: (search?: string) => [...queryKeys.jobs.all, 'archived', search] as const,
    details: () => [...queryKeys.jobs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
  },

  // Job Applications
  applications: {
    all: ['applications'] as const,
    lists: () => [...queryKeys.applications.all, 'list'] as const,
    list: (filters: ApplicationFiltersQuery) =>
      [...queryKeys.applications.lists(), filters] as const,
    details: () => [...queryKeys.applications.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.applications.details(), id] as const,
  },

  ats: {
    all: ['ats'] as const,
    access: () => [...queryKeys.ats.all, 'access'] as const,
    accessGrants: () => [...queryKeys.ats.all, 'access-grants'] as const,
  },

  // Tickets
  tickets: {
    all: ['tickets'] as const,
    lists: () => [...queryKeys.tickets.all, 'list'] as const,
    list: (filters: TicketFilters) => [...queryKeys.tickets.lists(), filters] as const,
    details: () => [...queryKeys.tickets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tickets.details(), id] as const,
    assignees: () => [...queryKeys.tickets.all, 'assignees'] as const,
    attachments: (id: string) => [...queryKeys.tickets.all, 'attachments', id] as const,
    comments: (id: string) => [...queryKeys.tickets.all, 'comments', id] as const,
  },

  crm: {
    all: ['crm'] as const,
    access: () => [...queryKeys.crm.all, 'access'] as const,
    accessGrants: (tracker?: 'meta_leads' | 'google_ads_leads' | 'sn_tech_inquiries') =>
      [...queryKeys.crm.all, 'access-grants', tracker ?? 'all'] as const,
    sfo: {
      all: () => [...queryKeys.crm.all, 'sfo'] as const,
      list: (filters: CrmSfoFilters) => [...queryKeys.crm.sfo.all(), 'list', filters] as const,
      detail: (id: string) => [...queryKeys.crm.sfo.all(), 'detail', id] as const,
    },
    tech: {
      all: () => [...queryKeys.crm.all, 'tech'] as const,
      list: (filters: CrmTechFilters) => [...queryKeys.crm.tech.all(), 'list', filters] as const,
      detail: (id: string) => [...queryKeys.crm.tech.all(), 'detail', id] as const,
    },
  },

  // Ticket Handlers
  ticketHandlers: {
    all: ['ticket-handlers'] as const,
    list: () => [...queryKeys.ticketHandlers.all, 'list'] as const,
    me: () => [...queryKeys.ticketHandlers.all, 'me'] as const,
  },

  // Company Calendar (read-only Google Calendar via Service Account)
  companyPulse: {
    all: ['company-pulse'] as const,
    events: (filters: CompanyCalendarFilters = {}) =>
      [...queryKeys.companyPulse.all, 'events', filters] as const,
  },

  // Projects (Intern Project Tracker)
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters: ProjectFilters) => [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
    documentation: (projectId: string) =>
      [...queryKeys.projects.all, 'documentation', projectId] as const,
    milestones: (projectId: string) =>
      [...queryKeys.projects.all, 'milestones', projectId] as const,
    checklist: (milestoneId: string) =>
      [...queryKeys.projects.all, 'checklist', milestoneId] as const,
    pools: () => [...queryKeys.projects.all, 'pool'] as const,
    pool: (status: ProjectPoolStatus = 'claimable') =>
      [...queryKeys.projects.pools(), status] as const,
    poolCount: (status: ProjectPoolStatus = 'claimable') =>
      [...queryKeys.projects.pools(), 'count', status] as const,
  },

  adminProjects: {
    all: ['admin-projects'] as const,
    overview: () => [...queryKeys.adminProjects.all, 'overview'] as const,
  },

  leaderboard: {
    all: ['leaderboard'] as const,
    list: (scope: string, period: string) =>
      [...queryKeys.leaderboard.all, scope, period] as const,
  },
} as const;

// Type helpers for query key extraction
export type QueryKeys = typeof queryKeys;
