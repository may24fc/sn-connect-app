import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface ProfileInfoUpdate {
  nationality?: string;
  contactNumber?: string;
  emailAddress?: string;
  companyEmail?: string;
  education?: string;
  major?: string;
  birthday?: string;
  age?: number | null;
  address?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  emergencyContactRelationship?: string;
  linkedinProfileUrl?: string;
}

/**
 * Hook to partially update the current user's profile information.
 * Sends only the changed fields — no "all required" constraint.
 */
export function useUpdateProfileInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: ProfileInfoUpdate): Promise<{ data: unknown }> => {
      const response = await fetch('/api/profile/info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: 'Failed to update profile' }));

        const fieldErrors = body?.details?.fieldErrors as Record<string, string[]> | undefined;
        if (fieldErrors) {
          const messages = Object.entries(fieldErrors)
            .map(([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`)
            .join('; ');
          throw new Error(messages || body.error || 'Validation failed');
        }

        throw new Error(body.error || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
}
