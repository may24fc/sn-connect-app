import { type InternshipFilters, queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface InternshipSummaryRecord {
  id: string;
  internshipId: string;
  employeeId: string;
  userId: string;
  name: string;
  email: string;
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
  supervisorFeedback?: string;
  status: 'submitted' | 'reviewed' | 'needs_revision';
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
    supervisor_notes: string | null;
    is_approved: boolean;
    approved_by: string | null;
    approved_at: string | null;
    created_at: string;
  }>;
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
        const error = await response.json().catch(() => ({ error: 'Failed to fetch internship logs' }));
        throw new Error(error.error || 'Failed to fetch internship logs');
      }

      return response.json();
    },
  });
}

export function useCreateInternDailyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      internshipId: string;
      logDate: string;
      hoursWorked: number;
      tasksCompleted: string;
      learnings?: string;
      challenges?: string;
    }) => {
      const response = await fetch(`/api/internships/${payload.internshipId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logDate: payload.logDate,
          hoursWorked: payload.hoursWorked,
          tasksCompleted: payload.tasksCompleted,
          learnings: payload.learnings,
          challenges: payload.challenges,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create daily log' }));
        throw new Error(error.error || 'Failed to create daily log');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internships.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.internships.logs(variables.internshipId) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.internships.logs(variables.internshipId) });
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
