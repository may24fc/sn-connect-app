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
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to update onboarding profile' }));
        throw new Error(error.error || 'Failed to update onboarding profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
    },
  });
}
