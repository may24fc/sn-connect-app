import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface ProbationRecord {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  department: string;
  position: string;
  startDate: string;
  probationEndDate: string;
  stage: 1 | 2 | 3 | 4;
  status: 'on-track' | 'at-risk' | 'completed' | 'extended';
  daysRemaining: number;
  manager: string;
  documentsComplete: number;
  totalDocuments: number;
  okrs: Array<{
    id: string;
    objective: string;
    keyResults: Array<{
      id: string;
      description: string;
      target: string;
      current: string;
      progress: number;
    }>;
    status: 'draft' | 'submitted' | 'approved' | 'in_progress' | 'completed';
  }>;
  kpis: Array<{
    id: string;
    name: string;
    description: string;
    target: string;
    actual: string;
    score: number;
  }>;
}

interface ProbationResponse {
  data: Array<ProbationRecord>;
}

export function useProbation() {
  return useQuery({
    queryKey: queryKeys.probation.list(),
    queryFn: async (): Promise<ProbationResponse> => {
      const response = await fetch('/api/probation');
      if (!response.ok) {
        throw new Error('Failed to fetch probation data');
      }
      return response.json();
    },
  });
}

export function useExtendProbation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      employeeId: string;
      newProbationEndDate: string;
      reason?: string;
    }) => {
      const response = await fetch('/api/probation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend', ...payload }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to extend probation');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.probation.all });
    },
  });
}

export function useCompleteProbation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      employeeId: string;
      finalRating?: number;
      comments?: string;
    }) => {
      const response = await fetch('/api/probation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', ...payload }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete probation');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.probation.all });
    },
  });
}

export function useSetProbationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      employeeId: string;
      status: 'on-track' | 'at-risk';
    }) => {
      const response = await fetch('/api/probation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-status', ...payload }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update probation status');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.probation.all });
    },
  });
}
