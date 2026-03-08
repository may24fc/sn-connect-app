import { useMutation, useQueryClient } from '@tanstack/react-query';

interface InviteUserPayload {
  email: string;
  role: 'employee' | 'intern';
  firstName: string;
  lastName: string;
  departmentId?: string | undefined;
  position?: string | undefined;
}

interface InviteUserResponse {
  message: string;
  data: {
    userId: string;
    email: string;
    temporaryPassword: string;
    role: string;
  };
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InviteUserPayload): Promise<InviteUserResponse> => {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to invite user' }));
        throw new Error(error.error || 'Failed to invite user');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'profiles'] });
    },
  });
}

interface ApproveOnboardingPayload {
  userId: string;
  approved: boolean;
  notes?: string;
}

interface ApproveOnboardingResponse {
  message: string;
  data: {
    userId: string;
    status: string;
    notes?: string;
  };
}

export function useApproveOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ApproveOnboardingPayload): Promise<ApproveOnboardingResponse> => {
      const response = await fetch('/api/users/approve-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to approve onboarding' }));
        throw new Error(error.error || 'Failed to approve onboarding');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate onboarding queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'profiles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      // Refresh internship and probation tables so approved users appear immediately
      queryClient.invalidateQueries({ queryKey: ['internships'] });
      queryClient.invalidateQueries({ queryKey: ['probation'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
