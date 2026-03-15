import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE_TIMES } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start: string | null;
  end: string | null;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
  status: string;
}

interface CalendarEventsResponse {
  connected: boolean;
  data: CalendarEvent[];
  error?: string;
}

export function useCalendarEvents(timeMin?: string, timeMax?: string) {
  return useQuery({
    queryKey: queryKeys.calendar.events(timeMin, timeMax),
    queryFn: async (): Promise<CalendarEventsResponse> => {
      const params = new URLSearchParams();
      if (timeMin) params.append('timeMin', timeMin);
      if (timeMax) params.append('timeMax', timeMax);

      const response = await fetch(`/api/calendar/events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch calendar events');
      return response.json();
    },
    staleTime: STALE_TIMES.standard,
  });
}

export function useCalendarAuthUrl() {
  return useQuery({
    queryKey: queryKeys.calendar.authUrl(),
    queryFn: async (): Promise<{ url: string }> => {
      const response = await fetch('/api/calendar/auth-url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      return response.json();
    },
    enabled: false, // Only fetch when explicitly requested
  });
}

export function useDisconnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/calendar/disconnect', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to disconnect calendar');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
}
