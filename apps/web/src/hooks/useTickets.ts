import { STALE_TIMES } from '@/lib/query-client';
import { type TicketFilters, queryKeys } from '@/lib/query-keys';
import type { TicketCreateInput, TicketUpdateInput } from '@/lib/schemas/ticket.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface TicketRecord {
  id: string;
  title: string;
  description: string;
  team: 'hr' | 'it';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'triaged' | 'assigned' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
  submitted_by: string;
  assigned_to: string | null;
  assigned_by: string | null;
  triaged_by: string | null;
  triaged_at: string | null;
  resolution_summary: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
  submitted_by_name?: string | null;
  assigned_to_name?: string | null;
  assigned_by_name?: string | null;
}

interface TicketListResponse {
  data: Array<TicketRecord>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useTickets(filters: TicketFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.tickets.list(filters),
    queryFn: async (): Promise<TicketListResponse> => {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.team) params.append('team', filters.team);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.scope) params.append('scope', filters.scope);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

      const response = await fetch(`/api/tickets?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch tickets' }));
        throw new Error(error.error || 'Failed to fetch tickets');
      }

      return response.json();
    },
    enabled: options.enabled ?? true,
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TicketCreateInput): Promise<{ data: TicketRecord }> => {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create ticket' }));
        throw new Error(error.error || 'Failed to create ticket');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: TicketUpdateInput }): Promise<{ data: TicketRecord }> => {
      const response = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update ticket' }));
        throw new Error(error.error || 'Failed to update ticket');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(variables.id) });
    },
  });
}