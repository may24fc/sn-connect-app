import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Server-confirmed: the file is removed from storage and required documents gate the
 * onboarding checklist, so the list only changes once the server agrees.
 */
export function useDeleteOnboardingDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      const response = await fetch(`/api/onboarding/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to delete onboarding document' }));
        throw new Error(error.error || 'Failed to delete onboarding document');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.documents.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.profile() });
    },
  });
}
