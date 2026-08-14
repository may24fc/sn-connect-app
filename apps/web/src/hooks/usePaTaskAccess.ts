'use client';

import { queryKeys } from '@/lib/query-keys';
import type { PaTaskAccessLevel } from '@/types/pa-task.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface PaTaskAccessEnvelope {
  data: {
    canAccess: boolean;
    canManage: boolean;
    hasGrant: boolean;
    accessLevel: PaTaskAccessLevel | null;
    role: string | null;
  };
}

interface PaTaskAccessGrantsEnvelope {
  data: Array<{
    id: string;
    userId: string;
    accessLevel: PaTaskAccessLevel;
    createdAt: string;
    updatedAt: string;
    grantedBy: string | null;
    grantedByName: string | null;
    fullName: string;
    email: string | null;
    role: string | null;
    position: string | null;
    department: string | null;
  }>;
}

interface PaTaskAssignableUsersEnvelope {
  data: Array<{
    userId: string;
    fullName: string;
    role: string | null;
    accessLevel: PaTaskAccessLevel;
  }>;
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: fallbackMessage }));
    throw new Error(payload.error || fallbackMessage);
  }
  return response.json() as Promise<T>;
}

export function usePaTaskAccess(enabled = true) {
  return useQuery({
    queryKey: queryKeys.paTasks.access(),
    enabled,
    queryFn: async () => {
      const response = await fetch('/api/pa-tasks/access');
      const payload = await readJson<PaTaskAccessEnvelope>(response, 'Failed to load PA task access');
      return payload.data;
    },
    staleTime: 60 * 1000,
  });
}

export function usePaTaskAccessGrants(enabled = true) {
  return useQuery({
    queryKey: queryKeys.paTasks.accessGrants(),
    enabled,
    queryFn: async () => {
      const response = await fetch('/api/pa-tasks/access-grants');
      return readJson<PaTaskAccessGrantsEnvelope>(response, 'Failed to load PA task access grants');
    },
  });
}

export function usePaTaskAssignableUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.paTasks.assignableUsers(),
    enabled,
    queryFn: async () => {
      const response = await fetch('/api/pa-tasks/assignable-users');
      return readJson<PaTaskAssignableUsersEnvelope>(response, 'Failed to load PA task assignees');
    },
  });
}

export function useGrantPaTaskAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { userId: string; accessLevel: PaTaskAccessLevel }) => {
      const response = await fetch('/api/pa-tasks/access-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return readJson<PaTaskAccessGrantsEnvelope>(response, 'Failed to grant PA task access');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.paTasks.access() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.paTasks.accessGrants() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.paTasks.assignableUsers() });
    },
  });
}

export function useRevokePaTaskAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch('/api/pa-tasks/access-grants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      return readJson<PaTaskAccessGrantsEnvelope>(response, 'Failed to revoke PA task access');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.paTasks.access() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.paTasks.accessGrants() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.paTasks.assignableUsers() });
    },
  });
}
