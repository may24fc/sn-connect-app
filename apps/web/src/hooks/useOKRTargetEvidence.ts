import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface OKRTargetEvidenceRow {
  id: string;
  okr_target_id: string;
  submitted_by: string;
  evidence_type: 'link' | 'note' | 'file';
  content: string;
  label: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
  submitted_by_name: string;
  download_url?: string | null;
}

export function useOKRTargetEvidence(okrTargetId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.performance.okrTargetEvidence(okrTargetId || ''),
    queryFn: async (): Promise<{ data: Array<OKRTargetEvidenceRow> }> => {
      if (!okrTargetId) throw new Error('OKR target ID is required');
      const response = await fetch(`/api/performance/okr-targets/${okrTargetId}/evidence`);
      if (!response.ok) throw new Error('Failed to fetch evidence');
      return response.json();
    },
    enabled: !!okrTargetId,
  });
}

export function useCreateOKRTargetEvidence(okrTargetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload:
        | { file: File; label?: string | null }
        | { evidenceType: 'link' | 'note'; content: string; label?: string | null }
    ): Promise<{
      data: OKRTargetEvidenceRow;
    }> => {
      const requestInit: RequestInit = { method: 'POST' };

      if ('file' in payload) {
        const formData = new FormData();
        formData.set('file', payload.file);
        if (payload.label) {
          formData.set('label', payload.label);
        }
        requestInit.body = formData;
      } else {
        requestInit.headers = { 'Content-Type': 'application/json' };
        requestInit.body = JSON.stringify(payload);
      }

      const response = await fetch(
        `/api/performance/okr-targets/${okrTargetId}/evidence`,
        requestInit
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit evidence');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.performance.okrTargetEvidence(okrTargetId),
      });
    },
  });
}

export function useDeleteOKRTargetEvidence(okrTargetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (evidenceId: string): Promise<void> => {
      const response = await fetch(
        `/api/performance/okr-targets/${okrTargetId}/evidence?evidenceId=${evidenceId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete evidence');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.performance.okrTargetEvidence(okrTargetId),
      });
    },
  });
}
