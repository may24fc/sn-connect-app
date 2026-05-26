import { queryKeys } from '@/lib/query-keys';
import type { KPIEvidenceType } from '@hr-portal/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface KPIEvidenceRow {
  id: string;
  kpi_id: string;
  submitted_by: string;
  evidence_type: KPIEvidenceType;
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

export function useKPIEvidence(kpiId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.performance.kpiEvidence(kpiId || ''),
    queryFn: async (): Promise<{ data: KPIEvidenceRow[] }> => {
      if (!kpiId) throw new Error('KPI ID is required');
      const response = await fetch(`/api/performance/kpis/${kpiId}/evidence`);
      if (!response.ok) throw new Error('Failed to fetch evidence');
      return response.json();
    },
    enabled: !!kpiId,
  });
}

export function useCreateKPIEvidence(kpiId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      evidenceType: KPIEvidenceType;
      content: string;
      label?: string | null;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    }): Promise<{ data: KPIEvidenceRow }> => {
      const response = await fetch(`/api/performance/kpis/${kpiId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit evidence');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.performance.kpiEvidence(kpiId),
      });
    },
  });
}

export function useDeleteKPIEvidence(kpiId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (evidenceId: string): Promise<void> => {
      const response = await fetch(
        `/api/performance/kpis/${kpiId}/evidence?evidenceId=${evidenceId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete evidence');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.performance.kpiEvidence(kpiId),
      });
    },
  });
}
