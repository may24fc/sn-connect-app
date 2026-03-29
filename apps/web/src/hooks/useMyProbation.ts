import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface MyProbationData {
  employeeId: string;
  name: string;
  position: string;
  department: string;
  startDate: string;
  endDate: string | null;
  stage: 1 | 2 | 3 | 4;
  status: 'on-track' | 'at-risk' | 'completed' | 'extended';
  daysRemaining: number;
  totalDays: number;
  elapsedDays: number;
  progressPercent: number;
  finalRating: number | null;
  managerComments: string | null;
  completedAt: string | null;
}

interface MyProbationResponse {
  data: MyProbationData | null;
  onProbation: boolean;
  probationState: 'none' | 'active' | 'completed';
}

export function useMyProbation(enabled = true) {
  return useQuery({
    queryKey: queryKeys.probation.me(),
    queryFn: async (): Promise<MyProbationResponse> => {
      const response = await fetch('/api/probation/me');
      if (!response.ok) {
        throw new Error('Failed to fetch probation status');
      }
      return response.json();
    },
    enabled,
  });
}
