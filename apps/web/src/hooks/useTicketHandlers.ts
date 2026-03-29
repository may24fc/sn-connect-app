import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface TicketHandlerRecord {
  user_id: string;
  team: 'it';
  is_active: boolean;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string | null;
  assigned_by_name: string | null;
}

interface TicketHandlerListResponse {
  data: Array<TicketHandlerRecord>;
}

export function useTicketHandlers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.ticketHandlers.list(),
    queryFn: async (): Promise<TicketHandlerListResponse> => {
      const response = await fetch('/api/ticket-handlers');

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch ticket handlers' }));
        throw new Error(error.error || 'Failed to fetch ticket handlers');
      }

      return response.json();
    },
    enabled,
  });
}

export function useTicketHandlerStatus(enabled = true) {
  return useQuery({
    queryKey: queryKeys.ticketHandlers.me(),
    queryFn: async (): Promise<{ data: { isItHandler: boolean } }> => {
      const response = await fetch('/api/ticket-handlers/me');

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch ticket handler status' }));
        throw new Error(error.error || 'Failed to fetch ticket handler status');
      }

      return response.json();
    },
    enabled,
  });
}

export function useAddTicketHandler() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      const response = await fetch('/api/ticket-handlers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to add IT handler' }));
        throw new Error(error.error || 'Failed to add IT handler');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ticketHandlers.all });
    },
  });
}

export function useRemoveTicketHandler() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      const response = await fetch(`/api/ticket-handlers?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to remove IT handler' }));
        throw new Error(error.error || 'Failed to remove IT handler');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ticketHandlers.all });
    },
  });
}