import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface MilestoneEntry {
  employeeId: string;
  userId: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: string | null;
  department: string | null;
  position: string | null;
  type: 'birthday' | 'anniversary';
  date: string;
  upcomingDate: string;
  daysUntil: number;
  yearsCount?: number;
}

export interface MilestonesResponse {
  data: MilestoneEntry[];
  grouped: {
    today: MilestoneEntry[];
    thisWeek: MilestoneEntry[];
    thisMonth: MilestoneEntry[];
    later: MilestoneEntry[];
  };
  summary: {
    total: number;
    birthdays: number;
    anniversaries: number;
    today: number;
    thisWeek: number;
  };
}

export interface MilestoneFilters {
  days?: number;
  type?: 'birthday' | 'anniversary' | 'all';
}

export function useMilestones(filters: MilestoneFilters = {}) {
  return useQuery({
    queryKey: queryKeys.milestones.list(filters),
    queryFn: async (): Promise<MilestonesResponse> => {
      const params = new URLSearchParams();
      if (filters.days) params.append('days', String(filters.days));
      if (filters.type) params.append('type', filters.type);

      const query = params.toString();
      const response = await fetch(`/api/milestones${query ? `?${query}` : ''}`);

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to fetch milestones' }));
        throw new Error(error.error || 'Failed to fetch milestones');
      }

      return response.json();
    },
  });
}
