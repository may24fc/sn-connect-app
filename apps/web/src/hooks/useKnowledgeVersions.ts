import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface KnowledgeVersionRecord {
  id: string;
  version_number: number;
  title: string;
  content: string;
  changed_by: string;
  changed_by_name: string;
  change_summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface VersionHistoryResponse {
  data: {
    source: {
      id: string;
      title: string;
      current_version: number;
    };
    versions: KnowledgeVersionRecord[];
  };
}

/**
 * Fetch version history for a knowledge source.
 */
export function useKnowledgeVersions(sourceId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.aiKnowledge.source(sourceId || ''), 'versions'] as const,
    queryFn: async (): Promise<VersionHistoryResponse['data']> => {
      const response = await fetch(`/api/ai/sources/${sourceId}/versions`);

      if (!response.ok) {
        throw new Error('Failed to fetch version history');
      }

      const json: VersionHistoryResponse = await response.json();
      return json.data;
    },
    enabled: !!sourceId,
  });
}

/**
 * Restore a knowledge source to a previous version.
 */
export function useRestoreKnowledgeVersion(sourceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionNumber: number) => {
      const response = await fetch(`/api/ai/sources/${sourceId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionNumber }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to restore version' }));
        throw new Error(error.error || 'Failed to restore version');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate both the source detail and version history
      queryClient.invalidateQueries({
        queryKey: queryKeys.aiKnowledge.source(sourceId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.aiKnowledge.sources(),
      });
    },
  });
}
