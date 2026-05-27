import type { EvaluationCadenceSummary } from '@/lib/performance/evaluation-cadence';
import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export function useEvaluationCadence(enabled = true) {
  return useQuery({
    queryKey: queryKeys.performance.evaluationCadence(),
    enabled,
    queryFn: async (): Promise<EvaluationCadenceSummary> => {
      const response = await fetch('/api/performance/evaluation-cadence');
      if (!response.ok) {
        throw new Error('Failed to fetch evaluation cadence status');
      }

      return response.json() as Promise<EvaluationCadenceSummary>;
    },
  });
}