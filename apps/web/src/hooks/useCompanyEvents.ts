import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/lib/query-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface CompanyEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string | null;
  category: 'holiday' | 'meeting' | 'deadline' | 'company' | 'team' | 'training';
  department_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CompanyEventsResponse {
  data: CompanyEvent[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export function useCompanyEvents(timeMin?: string, timeMax?: string, category?: string) {
  return useQuery({
    queryKey: queryKeys.companyEvents.list(timeMin, timeMax, category),
    queryFn: async (): Promise<CompanyEventsResponse> => {
      const params = new URLSearchParams();
      if (timeMin) params.set('timeMin', timeMin);
      if (timeMax) params.set('timeMax', timeMax);
      if (category) params.set('category', category);
      params.set('pageSize', '50');

      const res = await fetch(`/api/company-events?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch company events');
      return res.json();
    },
    staleTime: STALE_TIMES.standard,
  });
}

export function useCreateCompanyEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      start_time: string;
      end_time: string;
      all_day?: boolean;
      location?: string;
      category?: string;
      department_id?: string;
    }) => {
      const res = await fetch('/api/company-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create event');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companyEvents.all });
    },
  });
}

export function useUpdateCompanyEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/company-events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to update event');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companyEvents.all });
    },
  });
}

export function useDeleteCompanyEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/company-events/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to delete event');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companyEvents.all });
    },
  });
}
