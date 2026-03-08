import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface DirectoryFilters {
  search?: string;
  role?: string;
  department?: string;
  status?: string;
  employmentType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface DirectoryEntry {
  user_id: string;
  employee_id: string | null;
  avatar_url: string | null;
  full_name: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  role: string;
  department_name: string | null;
  department_id: string | null;
  position: string | null;
  status: string | null;
  employment_type: string | null;
  start_date: string | null;
  email: string | null;
  contact_number: string | null;
  birthday: string | null;
  nationality: string | null;
  education: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  linkedin_profile_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  emergency_contact_relationship: string | null;
  personal_email: string | null;
  payment_account_name: string | null;
  payment_account_number: string | null;
  payment_email: string | null;
  payment_phone_number: string | null;
  payment_address: string | null;
  payment_city: string | null;
  payment_province: string | null;
  payment_zipcode: string | null;
  internship_id: string | null;
  internship_status: string | null;
  completed_hours: number | null;
  required_hours: number | null;
  school: string | null;
  program: string | null;
  pending_changes_count: number | null;
}

export interface DirectoryResponse {
  data: DirectoryEntry[];
  metadata: {
    total: number;
    active: number;
    interns: number;
    onLeave: number;
    probation: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useDirectory(filters: DirectoryFilters = {}) {
  return useQuery({
    queryKey: queryKeys.directory.list(filters),
    queryFn: async (): Promise<DirectoryResponse> => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      if (filters.employmentType) params.append('employment_type', filters.employmentType);
      if (filters.sortBy) params.append('sort_by', filters.sortBy);
      if (filters.sortOrder) params.append('sort_order', filters.sortOrder);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('page_size', String(filters.pageSize));

      const query = params.toString();
      const response = await fetch(`/api/directory${query ? `?${query}` : ''}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch directory' }));
        throw new Error(error.error || 'Failed to fetch directory');
      }

      return response.json();
    },
  });
}

export function useDirectoryExport(filters: DirectoryFilters = {}) {
  return {
    exportCsv: async () => {
      const params = new URLSearchParams();
      params.append('format', 'csv');
      if (filters.role) params.append('role', filters.role);
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`/api/directory/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to export directory');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employee-directory-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}

// ─── Directory Detail ────────────────────────────────────────────────

export interface DirectoryDetailEntry extends DirectoryEntry {
  pending_change_requests: Array<{
    id: string;
    changes: Record<string, { old: string | null; new: string | null }>;
    requested_at: string;
    status: string;
    review_note: string | null;
    reviewed_at: string | null;
    reviewed_by: string | null;
  }>;
}

export interface DirectoryDetailResponse {
  data: DirectoryDetailEntry;
}

export function useDirectoryDetail(userId: string) {
  return useQuery({
    queryKey: queryKeys.directory.detail(userId),
    queryFn: async (): Promise<DirectoryDetailResponse> => {
      const response = await fetch(`/api/directory/${userId}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch employee' }));
        throw new Error(error.error || 'Failed to fetch employee');
      }
      return response.json();
    },
    enabled: !!userId,
  });
}

// ─── Profile Change Requests ─────────────────────────────────────────

export interface ProfileChangeRequest {
  id: string;
  employee_id: string;
  requested_by: string;
  reviewed_by: string | null;
  status: 'pending' | 'approved' | 'rejected';
  changes: Record<string, { old: string | null; new: string | null }>;
  review_note: string | null;
  requested_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileChangeRequestsResponse {
  data: ProfileChangeRequest[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useProfileChangeRequests(
  filters: {
    employeeId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  return useQuery({
    queryKey: queryKeys.profileChangeRequests.list(filters),
    queryFn: async (): Promise<ProfileChangeRequestsResponse> => {
      const params = new URLSearchParams();
      if (filters.employeeId) params.append('employee_id', filters.employeeId);
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('page_size', String(filters.pageSize));

      const query = params.toString();
      const response = await fetch(`/api/profile-change-requests${query ? `?${query}` : ''}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch' }));
        throw new Error(error.error || 'Failed to fetch change requests');
      }
      return response.json();
    },
  });
}

export function useCreateProfileChangeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employee_id: string;
      changes: Record<string, { old: string | null; new: string | null }>;
    }) => {
      const response = await fetch('/api/profile-change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create' }));
        throw new Error(error.error || 'Failed to create change request');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profileChangeRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.directory.all });
    },
  });
}

export function useReviewProfileChangeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      action: 'approve' | 'reject';
      review_note?: string | undefined;
    }) => {
      const { id, ...body } = payload;
      const response = await fetch(`/api/profile-change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to review' }));
        throw new Error(error.error || 'Failed to review change request');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profileChangeRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.directory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
}
