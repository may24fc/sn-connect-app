import { queryKeys } from '@/lib/query-keys';
import type { UpdateOnboardingStepInput } from '@/lib/schemas/onboarding.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateOnboardingProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateOnboardingStepInput) => {
      const response = await fetch('/api/onboarding/profile/step', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: 'Failed to update onboarding profile' }));
        console.error('Update onboarding profile error:', body);

        // Build a human-readable message from the Zod field errors when available
        const fieldErrors = body?.details?.fieldErrors as
          | Record<string, string[]>
          | undefined;
        if (fieldErrors) {
          const messages = Object.entries(fieldErrors)
            .map(([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`)
            .join('; ');
          throw new Error(messages || body.error || 'Validation failed');
        }

        throw new Error(body.error || 'Failed to update onboarding profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
    },
  });
}
