import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UploadPayload {
  file: File;
  documentType: 'valid_id' | 'profile_photo' | 'cv' | 'birth_certificate';
}

export function useUploadOnboardingDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UploadPayload) => {
      const formData = new FormData();
      formData.append('file', payload.file);
      formData.append('documentType', payload.documentType);

      const response = await fetch('/api/onboarding/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to upload onboarding document' }));
        throw new Error(error.error || 'Failed to upload onboarding document');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.documents.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.profile() });
    },
  });
}
