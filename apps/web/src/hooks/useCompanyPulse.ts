import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface PulseEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string | null;
  allDay: boolean;
}

interface PulseResponse {
  configured: boolean;
  data: PulseEvent[];
  error?: string;
}

const FIVE_MINUTES = 5 * 60 * 1000;

export function useCompanyPulse() {
  return useQuery({
    queryKey: queryKeys.companyPulse.events(),
    queryFn: async (): Promise<PulseResponse> => {
      const res = await fetch('/api/calendar/events');
      if (!res.ok && res.status !== 502) {
        throw new Error('Failed to fetch company events');
      }
      return res.json();
    },
    staleTime: FIVE_MINUTES,
    refetchInterval: FIVE_MINUTES,
  });
}
