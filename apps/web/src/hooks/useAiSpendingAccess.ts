'use client';

import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface AiSpendingAccessResponse {
  canAccess: boolean;
  hasGrant: boolean;
  role: string | null;
}

interface AiSpendingAccessEnvelope {
  data: AiSpendingAccessResponse;
}

export interface AiSpendingAccessGrantRecord {
  id: string;
  userId: string;
  accessLevel: string;
  grantedAt: string;
  grantedBy: string | null;
  grantedByName: string | null;
  fullName: string | null;
  email: string | null;
  role: string | null;
  department: string | null;
  position: string | null;
}

interface AiSpendingAccessGrantsResponse {
  data: Array<AiSpendingAccessGrantRecord>;
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: fallbackMessage }));
    throw new Error(payload.error || fallbackMessage);
  }

  return response.json() as Promise<T>;
}

export function useAiSpendingAccess(enabled = true) {
  return useQuery({
    queryKey: queryKeys.aiSpending.access(),
    enabled,
    queryFn: async (): Promise<AiSpendingAccessResponse> => {
      const response = await fetch('/api/ai-expenses/access');
      const payload = await readJson<AiSpendingAccessEnvelope>(
        response,
        'Failed to load AI spending access'
      );
      return payload.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useAiSpendingAccessGrants(enabled = true) {
  return useQuery({
    queryKey: queryKeys.aiSpending.accessGrants(),
    enabled,
    queryFn: async (): Promise<AiSpendingAccessGrantsResponse> => {
      const response = await fetch('/api/ai-expenses/access-grants');
      return readJson<AiSpendingAccessGrantsResponse>(
        response,
        'Failed to load AI spending access grants'
      );
    },
  });
}

export function useGrantAiSpendingAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<AiSpendingAccessGrantsResponse> => {
      const response = await fetch('/api/ai-expenses/access-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      return readJson<AiSpendingAccessGrantsResponse>(
        response,
        'Failed to grant AI spending access'
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiSpending.accessGrants() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiSpending.access() });
    },
  });
}

export function useRevokeAiSpendingAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<AiSpendingAccessGrantsResponse> => {
      const response = await fetch('/api/ai-expenses/access-grants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      return readJson<AiSpendingAccessGrantsResponse>(
        response,
        'Failed to revoke AI spending access'
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiSpending.accessGrants() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiSpending.access() });
    },
  });
}
