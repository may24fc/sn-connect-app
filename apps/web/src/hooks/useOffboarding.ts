import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface OffboardingTaskRecord {
  id: string;
  offboarding_id: string;
  title: string;
  description: string | null;
  category: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  owner_type: 'employee' | 'internal';
  owner_label: string;
  can_complete: boolean;
}

export interface OffboardingEmployeeRecord {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  department: string | null;
  position: string | null;
  role: string | null;
}

export interface OffboardingRecord {
  id: string;
  employee_id: string;
  exit_type: 'resignation' | 'termination' | 'end_of_contract' | 'retirement';
  last_working_day: string;
  status: 'initiated' | 'in_progress' | 'completed';
  exit_interview_date: string | null;
  exit_interview_notes: string | null;
  initiated_by: string;
  created_at: string;
  updated_at: string;
  employee: OffboardingEmployeeRecord | null;
  offboarding_tasks: Array<OffboardingTaskRecord>;
}

export interface OffboardingResponse {
  data: Array<OffboardingRecord>;
}

export function useOffboarding(employeeId?: string, enabled = true) {
  return useQuery({
    queryKey: employeeId ? queryKeys.offboarding.list(employeeId) : queryKeys.offboarding.me(),
    queryFn: async (): Promise<OffboardingResponse> => {
      const endpoint = employeeId ? `/api/offboarding?employeeId=${employeeId}` : '/api/offboarding';
      const response = await fetch(endpoint);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch offboarding records' }));
        throw new Error(error.error || 'Failed to fetch offboarding records');
      }

      return response.json();
    },
    enabled,
  });
}

export function useOffboardingAdminList(enabled = true) {
  return useQuery({
    queryKey: queryKeys.offboarding.list(),
    queryFn: async (): Promise<OffboardingResponse> => {
      const response = await fetch('/api/offboarding');
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch offboarding records' }));
        throw new Error(error.error || 'Failed to fetch offboarding records');
      }

      return response.json();
    },
    enabled,
  });
}