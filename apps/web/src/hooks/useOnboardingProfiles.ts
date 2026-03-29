import { type OnboardingProfileFilters, queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface OnboardingProfileListItem {
  id: string;
  user_id: string;
  employee_id: string | null;
  full_name: string;
  email_address: string | null;
  status: 'completed' | 'in_progress';
  current_step: 'personal_info' | 'payment_info' | 'documents' | 'review';
  payment_account_masked: string | null;
  users?: { role?: 'employee' | 'intern' | null } | Array<{ role?: 'employee' | 'intern' | null }>;
  departments?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  created_at: string;
  updated_at: string;
}

interface OnboardingProfileListResponse {
  data: Array<OnboardingProfileListItem>;
  summary: {
    total: number;
    completed: number;
    inProgress: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useOnboardingProfiles(filters: OnboardingProfileFilters = {}) {
  return useQuery({
    queryKey: queryKeys.onboarding.profiles.list(filters),
    queryFn: async (): Promise<OnboardingProfileListResponse> => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.role) params.append('role', filters.role);
      if (filters.departmentId) params.append('departmentId', filters.departmentId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

      const query = params.toString();
      const response = await fetch(`/api/onboarding/profiles${query ? `?${query}` : ''}`);
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to fetch onboarding profiles' }));
        throw new Error(error.error || 'Failed to fetch onboarding profiles');
      }
      return response.json();
    },
  });
}
