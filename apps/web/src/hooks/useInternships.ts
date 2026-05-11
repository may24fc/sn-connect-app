import { type InternshipFilters, queryKeys } from '@/lib/query-keys';
import type { DailyLogAttachment, ProjectFocusEntry } from '@hr-portal/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ── Intern self-initialization types ──

export interface InitializeInternshipPayload {
  startDate: string;
  endDate: string;
  department: string;
  school: string;
  program: string;
  requiredHours?: number;
}

interface InitializeInternshipResponse {
  data: {
    id: string;
    employee_id: string;
    start_date: string;
    end_date: string;
    required_hours: number;
    completed_hours: number;
    status: string;
    department: string;
    school: string | null;
    program: string | null;
  };
}

export interface InternshipSummaryRecord {
  id: string;
  internshipId: string;
  employeeId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  school: string;
  program: string;
  department: string;
  supervisor: string;
  supervisorId: string | null;
  startDate: string;
  endDate: string;
  requiredHours: number;
  completedHours: number;
  progressPercentage: number;
  status: 'active' | 'completed' | 'terminated' | 'converted';
  pendingReports: number;
  lastReportDate: string | null;
  reportsThisWeek: number;
  createdAt: string;
  updatedAt: string;
}

export interface InternshipDailyReportRecord {
  id: string;
  internId: string;
  internshipPeriodId: string;
  date: string;
  tasksCompleted: string;
  hoursLogged: number;
  learnings: string;
  challenges?: string;
  projectEntries?: Array<ProjectFocusEntry>;
  blockers?: Array<string>;
  nextSteps?: Array<string>;
  attachments?: Array<DailyLogAttachment>;
  supervisorFeedback?: string;
  status: 'draft' | 'submitted' | 'reviewed' | 'needs_revision';
  submittedAt: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InternshipDetailRecord {
  id: string;
  internshipId: string;
  employeeId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone: string | null;
  school: string;
  program: string;
  department: string;
  supervisor: string;
  supervisorId: string | null;
  supervisorEmail: string | null;
  startDate: string;
  endDate: string;
  requiredHours: number;
  completedHours: number;
  status: 'active' | 'completed' | 'terminated' | 'on_hold';
  pendingReports: number;
  recentReports: Array<InternshipDailyReportRecord>;
  weeklyHours: Array<{
    week: string;
    hours: number;
    target: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface InternshipListResponse {
  data: Array<InternshipSummaryRecord>;
  summary: {
    totalInterns: number;
    activeInterns: number;
    completedInterns: number;
    averageProgress: number;
    totalHoursLogged: number;
    pendingReports: number;
    reportsThisWeek: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface InternshipDetailResponse {
  data: InternshipDetailRecord;
}

interface InternshipLogsResponse {
  data: Array<{
    id: string;
    internship_id: string;
    log_date: string;
    hours_worked: number;
    tasks_completed: string;
    learnings: string | null;
    challenges: string | null;
    project_entries?: Array<ProjectFocusEntry>;
    blockers?: Array<string>;
    next_steps?: Array<string>;
    attachments?: Array<DailyLogAttachment>;
    supervisor_notes: string | null;
    is_approved: boolean;
    approved_by: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at?: string;
    status?: string;
  }>;
}

function buildDailyLogFormData(payload: {
  logDate?: string;
  hoursWorked?: number;
  projectEntries?: Array<ProjectFocusEntry>;
  blockers?: Array<string>;
  nextSteps?: Array<string>;
  retainedAttachments?: Array<DailyLogAttachment>;
  attachments?: Array<File>;
  logId?: string;
  status?: 'draft' | 'submitted';
}): FormData {
  const formData = new FormData();
  formData.append(
    'payload',
    JSON.stringify({
      ...(payload.logId ? { logId: payload.logId } : {}),
      ...(payload.logDate !== undefined ? { logDate: payload.logDate } : {}),
      ...(payload.hoursWorked !== undefined ? { hoursWorked: payload.hoursWorked } : {}),
      ...(payload.projectEntries !== undefined ? { projectEntries: payload.projectEntries } : {}),
      ...(payload.blockers ? { blockers: payload.blockers } : {}),
      ...(payload.nextSteps ? { nextSteps: payload.nextSteps } : {}),
      ...(payload.retainedAttachments
        ? { retainedAttachments: payload.retainedAttachments }
        : {}),
      ...(payload.status ? { status: payload.status } : {}),
    })
  );

  for (const file of payload.attachments ?? []) {
    formData.append('files', file);
  }

  return formData;
}

interface InternshipActionResponse {
  data: {
    internshipId: string;
    status: 'completed' | 'converted';
    userId?: string;
    employeeId?: string;
    userRole?: 'employee';
    employmentType?: 'probationary';
  };
}

export function useInternships(filters: InternshipFilters = {}) {
  return useQuery({
    queryKey: queryKeys.internships.list(filters),
    queryFn: async (): Promise<InternshipListResponse> => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.school) params.append('school', filters.school);
      if (filters.supervisorId) params.append('supervisorId', filters.supervisorId);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

      const query = params.toString();
      const response = await fetch(`/api/internships${query ? `?${query}` : ''}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch internships' }));
        throw new Error(error.error || 'Failed to fetch internships');
      }

      return response.json();
    },
  });
}

export function useInternship(id: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.internships.detail(id || 'none'),
    enabled: enabled && !!id,
    queryFn: async (): Promise<InternshipDetailResponse> => {
      const response = await fetch(`/api/internships/${id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch internship' }));
        throw new Error(error.error || 'Failed to fetch internship');
      }

      return response.json();
    },
  });
}

export function useInternshipLogs(id: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.internships.logs(id || 'none'),
    enabled: enabled && !!id,
    queryFn: async (): Promise<InternshipLogsResponse> => {
      const response = await fetch(`/api/internships/${id}/logs`);
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to fetch internship logs' }));
        throw new Error(error.error || 'Failed to fetch internship logs');
      }

      return response.json();
    },
  });
}

async function getDailyLogMutationErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  const payload = await response.json().catch(() => ({ error: fallback }));
  const rawError = typeof payload?.error === 'string' ? payload.error : fallback;

  if (
    response.status === 409 &&
    rawError.toLowerCase().includes('daily log already exists for this date')
  ) {
    return 'You already have an EOD report for this date. Edit the existing report or choose a different date.';
  }

  return rawError;
}

export function useCreateInternDailyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      internshipId: string;
      logDate: string;
      hoursWorked: number;
      projectEntries: Array<ProjectFocusEntry>;
      blockers?: Array<string>;
      nextSteps?: Array<string>;
      attachments?: Array<File>;
      retainedAttachments?: Array<DailyLogAttachment>;
      status?: 'draft' | 'submitted';
    }) => {
      const response = await fetch(`/api/internships/${payload.internshipId}/logs`, {
        method: 'POST',
        body: buildDailyLogFormData({
          logDate: payload.logDate,
          hoursWorked: payload.hoursWorked,
          projectEntries: payload.projectEntries,
          ...(payload.blockers ? { blockers: payload.blockers } : {}),
          ...(payload.nextSteps ? { nextSteps: payload.nextSteps } : {}),
          ...(payload.attachments ? { attachments: payload.attachments } : {}),
          ...(payload.retainedAttachments
            ? { retainedAttachments: payload.retainedAttachments }
            : {}),
          status: payload.status ?? 'submitted',
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getDailyLogMutationErrorMessage(response, 'Failed to create daily log')
        );
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internships.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.internships.logs(variables.internshipId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.internships.detail(variables.internshipId),
      });
    },
  });
}

/** Update an intern's own draft log (edit content or submit). */
export function useUpdateInternDraftLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      internshipId: string;
      logId: string;
      logDate?: string;
      hoursWorked?: number;
      projectEntries?: Array<ProjectFocusEntry>;
      blockers?: Array<string>;
      nextSteps?: Array<string>;
      attachments?: Array<File>;
      retainedAttachments?: Array<DailyLogAttachment>;
      status?: 'draft' | 'submitted';
    }) => {
      const response = await fetch(`/api/internships/${payload.internshipId}/logs`, {
        method: 'PATCH',
        body: buildDailyLogFormData({
          logId: payload.logId,
          ...(payload.logDate !== undefined ? { logDate: payload.logDate } : {}),
          ...(payload.hoursWorked !== undefined ? { hoursWorked: payload.hoursWorked } : {}),
          ...(payload.projectEntries !== undefined
            ? { projectEntries: payload.projectEntries }
            : {}),
          ...(payload.blockers ? { blockers: payload.blockers } : {}),
          ...(payload.nextSteps ? { nextSteps: payload.nextSteps } : {}),
          ...(payload.attachments ? { attachments: payload.attachments } : {}),
          ...(payload.retainedAttachments
            ? { retainedAttachments: payload.retainedAttachments }
            : {}),
          ...(payload.status ? { status: payload.status } : {}),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update daily log' }));
        throw new Error(error.error || 'Failed to update daily log');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internships.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.internships.logs(variables.internshipId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.internships.detail(variables.internshipId),
      });
    },
  });
}

export function useUpdateInternDailyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      internshipId: string;
      logId: string;
      supervisorNotes?: string;
      isApproved?: boolean;
    }) => {
      const response = await fetch(`/api/internships/${payload.internshipId}/logs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId: payload.logId,
          supervisorNotes: payload.supervisorNotes,
          isApproved: payload.isApproved,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update daily log' }));
        throw new Error(error.error || 'Failed to update daily log');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.internships.logs(variables.internshipId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.internships.detail(variables.internshipId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.internships.all });
    },
  });
}

export function useUpdateInternship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      internshipId: string;
      updates: Record<string, unknown>;
    }) => {
      const response = await fetch(`/api/internships/${payload.internshipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.updates),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update internship' }));
        throw new Error(error.error || 'Failed to update internship');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internships.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.internships.detail(variables.internshipId),
      });
    },
  });
}

export function useEndInternship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { internshipId: string }): Promise<InternshipActionResponse> => {
      const response = await fetch(`/api/internships/${payload.internshipId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end_internship' }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to end internship' }));
        throw new Error(error.error || 'Failed to end internship');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internships.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.internships.detail(variables.internshipId),
      });
    },
  });
}

export function useHireInternAsEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { internshipId: string }): Promise<InternshipActionResponse> => {
      const response = await fetch(`/api/internships/${payload.internshipId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hire_as_employee' }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to hire intern as employee' }));
        throw new Error(error.error || 'Failed to hire intern as employee');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internships.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.internships.detail(variables.internshipId),
      });
    },
  });
}

/**
 * Mutation hook for intern self-initialization.
 * Creates an internship record for the authenticated intern user
 * who does not yet have one.
 */
export function useInitializeInternship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: InitializeInternshipPayload
    ): Promise<InitializeInternshipResponse> => {
      const response = await fetch('/api/internships/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to initialize internship' }));
        throw new Error(error.error || 'Failed to initialize internship');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all internship queries so the dashboard picks up the new record
      queryClient.invalidateQueries({ queryKey: queryKeys.internships.all });
    },
  });
}
