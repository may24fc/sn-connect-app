import { STALE_TIMES } from '@/lib/query-client';
import { type TicketFilters, queryKeys } from '@/lib/query-keys';
import type {
  TicketCategory,
  TicketCreateInput,
  TicketFeatureArea,
  TicketUpdateInput,
} from '@/lib/schemas/ticket.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface TicketRecord {
  id: string;
  title: string;
  description: string;
  team: 'hr' | 'it';
  category: TicketCategory;
  feature_area: TicketFeatureArea | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'triaged' | 'assigned' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  has_attachments: boolean;
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

export interface TicketAttachmentRecord {
  id: string;
  ticket_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  signed_url: string | null;
}

export interface TicketCommentRecord {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name: string;
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

export function useTicketAttachments(ticketId?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.tickets.attachments(ticketId ?? 'unknown'),
    queryFn: async (): Promise<{ data: Array<TicketAttachmentRecord> }> => {
      if (!ticketId) {
        return { data: [] };
      }

      const response = await fetch(`/api/tickets/${ticketId}/attachments`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch ticket attachments' }));
        throw new Error(error.error || 'Failed to fetch ticket attachments');
      }

      return response.json();
    },
    enabled: (options.enabled ?? true) && Boolean(ticketId),
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useTicketComments(ticketId?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.tickets.comments(ticketId ?? 'unknown'),
    queryFn: async (): Promise<{ data: Array<TicketCommentRecord> }> => {
      if (!ticketId) {
        return { data: [] };
      }

      const response = await fetch(`/api/tickets/${ticketId}/comments`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch ticket comments' }));
        throw new Error(error.error || 'Failed to fetch ticket comments');
      }

      return response.json();
    },
    enabled: (options.enabled ?? true) && Boolean(ticketId),
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useCreateTicketComment(ticketId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { content: string }): Promise<{ data: TicketCommentRecord }> => {
      if (!ticketId) {
        throw new Error('Ticket ID is required to add a comment');
      }

      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to post ticket comment' }));
        throw new Error(error.error || 'Failed to post ticket comment');
      }

      return response.json();
    },
    onSuccess: () => {
      if (ticketId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tickets.comments(ticketId) });
      }
    },
  });
}