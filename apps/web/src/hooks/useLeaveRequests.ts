import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE_TIMES } from '@/lib/query-client';
import { queryKeys, type LeaveRequestFilters } from '@/lib/query-keys';

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'maternity' | 'paternity' | 'unpaid';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewer_id: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LeaveRequestListResponse {
  data: LeaveRequest[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface CreateLeaveRequestPayload {
  leave_type: LeaveRequest['leave_type'];
  start_date: string;
  end_date: string;
  reason: string;
}

interface UpdateLeaveRequestPayload {
  id: string;
  status: 'approved' | 'rejected' | 'cancelled';
  reviewer_notes?: string;
}

export function useLeaveRequests(filters: LeaveRequestFilters = {}) {
  return useQuery({
    queryKey: queryKeys.leaveRequests.list(filters),
    queryFn: async (): Promise<LeaveRequestListResponse> => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

      const response = await fetch(`/api/leave-requests?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch leave requests');
      return response.json();
    },
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateLeaveRequestPayload) => {
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.details?.join(', ') ?? err.error ?? 'Failed to create leave request');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
    },
  });
}

export function useUpdateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateLeaveRequestPayload) => {
      const response = await fetch(`/api/leave-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? 'Failed to update leave request');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
    },
  });
}
