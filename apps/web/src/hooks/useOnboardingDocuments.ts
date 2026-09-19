import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery } from '@tanstack/react-query';

export interface OnboardingDocumentRecord {
  id: string;
  onboarding_profile_id: string;
  document_type: 'valid_id' | 'profile_photo' | 'cv' | 'birth_certificate';
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export function useOnboardingDocuments(profileId?: string) {
  return useQuery({
    queryKey: queryKeys.onboarding.documents.list(profileId),
    queryFn: async (): Promise<{ data: Array<OnboardingDocumentRecord> }> => {
      const endpoint = profileId
        ? `/api/onboarding/profiles/${profileId}/documents`
        : '/api/onboarding/documents';

      const response = await fetch(endpoint);
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to fetch onboarding documents' }));
        throw new Error(error.error || 'Failed to fetch onboarding documents');
      }
      return response.json();
    },
    enabled: profileId !== '',
  });
}

export interface OnboardingDocumentPreview {
  id: string;
  fileName: string;
  signedUrl: string;
}

/**
 * Requests a short-lived signed URL for an onboarding document.
 * Signed URLs expire, so this is a mutation rather than a cached query.
 */
export function useOnboardingDocumentPreview() {
  return useMutation({
    mutationFn: async (documentId: string): Promise<OnboardingDocumentPreview> => {
      const response = await fetch(`/api/onboarding/documents/${documentId}/preview`);

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to generate document preview' }));
        throw new Error(
          error.error ||
            (response.status === 403
              ? 'You are not allowed to preview this document'
              : 'Failed to generate document preview')
        );
      }

      const payload = (await response.json()) as { data: OnboardingDocumentPreview };
      return payload.data;
    },
  });
}
