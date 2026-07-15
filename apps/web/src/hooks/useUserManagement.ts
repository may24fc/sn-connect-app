import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type InviteUserRole = 'employee' | 'associate' | 'admin' | 'super_admin';

interface InviteUserPayload {
  email: string;
  role: InviteUserRole;
  firstName: string;
  lastName: string;
  departmentId?: string | undefined;
  divisionId?: string | undefined;
  position?: string | undefined;
  probationMode?: 'under_probation' | 'no_probation';
  probationAuto90?: boolean;
  probationEndDate?: string | undefined;
}

interface InviteUserResponse {
  message: string;
  data: {
    userId: string;
    email: string;
    temporaryPassword: string;
    role: string;
    reinvite?: boolean;
    emailSent?: boolean;
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
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      // Refresh internship and probation tables so approved users appear immediately
      queryClient.invalidateQueries({ queryKey: ['internships'] });
      queryClient.invalidateQueries({ queryKey: ['probation'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

interface DeleteRejectedOnboardingSubmissionPayload {
  profileId: string;
}

interface DeleteRejectedOnboardingSubmissionResponse {
  message: string;
  data: {
    profileId: string;
    userId: string;
    status: string;
  };
}

export function useDeleteRejectedOnboardingSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: DeleteRejectedOnboardingSubmissionPayload
    ): Promise<DeleteRejectedOnboardingSubmissionResponse> => {
      const response = await fetch(`/api/onboarding/profiles/${payload.profileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to delete rejected onboarding submission' }));
        throw new Error(error.error || 'Failed to delete rejected onboarding submission');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['internships'] });
      queryClient.invalidateQueries({ queryKey: ['probation'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
