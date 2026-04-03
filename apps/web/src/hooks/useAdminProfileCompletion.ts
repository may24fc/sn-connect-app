import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

/**
 * Checks whether an admin / super-admin user still needs to complete their
 * profile setup wizard.  Returns `needsSetup: true` when the user has no
 * completed onboarding profile AND is missing key employee fields.
 */
export function useAdminProfileCompletion() {
  return useQuery({
    queryKey: [...queryKeys.onboarding.all, 'admin-profile-completion'] as const,
    queryFn: async (): Promise<{ needsSetup: boolean }> => {
      const response = await fetch('/api/onboarding/profile/admin-status');
      if (!response.ok) {
        // If the API doesn't exist yet or errors, assume no setup needed
        return { needsSetup: false };
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
