import type { CompanyCalendarEvent } from '@/lib/company-calendar';
import { type CompanyCalendarFilters, queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export type PulseEvent = CompanyCalendarEvent;

interface PulseResponse {
  configured: boolean;
  data: Array<CompanyCalendarEvent>;
  error?: string;
}

const FIVE_MINUTES = 5 * 60 * 1000;

async function fetchCompanyCalendarEvents(filters: CompanyCalendarFilters = {}): Promise<PulseResponse> {
  const params = new URLSearchParams();

  if (filters.start) params.set('start', filters.start);
  if (filters.end) params.set('end', filters.end);
  if (filters.limit) params.set('limit', String(filters.limit));

  const query = params.toString();
  const res = await fetch(query ? `/api/calendar/events?${query}` : '/api/calendar/events');

  if (!res.ok && res.status !== 502) {
    throw new Error('Failed to fetch company events');
  }

  return res.json();
}

export function useCompanyCalendar(filters: CompanyCalendarFilters = {}) {
  return useQuery({
    queryKey: queryKeys.companyPulse.events(filters),
    queryFn: () => fetchCompanyCalendarEvents(filters),
    staleTime: FIVE_MINUTES,
    refetchInterval: FIVE_MINUTES,
  });
}

export function useCompanyPulse() {
  return useCompanyCalendar({ limit: 10 });
}
