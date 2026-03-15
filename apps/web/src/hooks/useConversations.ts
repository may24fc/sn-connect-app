'use client';

import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationsResponse {
  data: ConversationSummary[];
  total: number;
}

interface CreateConversationResponse {
  data: ConversationSummary;
}

interface RenameConversationResponse {
  data: { id: string; title: string; updated_at: string };
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchConversations(limit = 50, offset = 0): Promise<ConversationsResponse> {
  const res = await fetch(`/api/ai/conversations?limit=${limit}&offset=${offset}`);
  if (!res.ok) {
    throw new Error('Failed to fetch conversations');
  }
  return res.json();
}

async function createConversation(title?: string): Promise<ConversationSummary> {
  const res = await fetch('/api/ai/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error('Failed to create conversation');
  }
  const json: CreateConversationResponse = await res.json();
  return json.data;
}

async function renameConversation(id: string, title: string): Promise<RenameConversationResponse['data']> {
  const res = await fetch(`/api/ai/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error('Failed to rename conversation');
  }
  const json: RenameConversationResponse = await res.json();
  return json.data;
}

async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`/api/ai/conversations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete conversation');
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useConversations(limit = 50, offset = 0) {
  return useQuery({
    queryKey: queryKeys.aiKnowledge.conversations(limit, offset),
    queryFn: () => fetchConversations(limit, offset),
    staleTime: 30_000,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title?: string) => createConversation(title),
    onSuccess: (newConversation) => {
      // Optimistically prepend the new conversation to cached lists
      queryClient.setQueriesData<ConversationsResponse>(
        { queryKey: queryKeys.aiKnowledge.conversationsList() },
        (old) => {
          if (!old) return { data: [newConversation], total: 1 };
          return { data: [newConversation, ...old.data], total: old.total + 1 };
        }
      );
    },
  });
}

export function useRenameConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameConversation(id, title),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.aiKnowledge.conversationsList() });

      const previousData = queryClient.getQueriesData<ConversationsResponse>({
        queryKey: queryKeys.aiKnowledge.conversationsList(),
      });

      // Optimistic update
      queryClient.setQueriesData<ConversationsResponse>(
        { queryKey: queryKeys.aiKnowledge.conversationsList() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((c) => (c.id === id ? { ...c, title } : c)),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiKnowledge.conversationsList() });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.aiKnowledge.conversationsList() });

      const previousData = queryClient.getQueriesData<ConversationsResponse>({
        queryKey: queryKeys.aiKnowledge.conversationsList(),
      });

      // Optimistic removal
      queryClient.setQueriesData<ConversationsResponse>(
        { queryKey: queryKeys.aiKnowledge.conversationsList() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((c) => c.id !== id),
            total: old.total - 1,
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiKnowledge.conversationsList() });
    },
  });
}
