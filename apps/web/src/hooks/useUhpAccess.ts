'use client';

import { queryKeys } from '@/lib/query-keys';
import type { UhpModule } from '@/lib/uhp';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: fallback }));
    throw new Error(payload.error || fallback);
  }
  return response.json() as Promise<T>;
}

export interface UhpAccessResponse {
  canAccess: boolean;
  grantedModules: UhpModule[];
  isAdmin: boolean;
}

export interface UhpAccessGrant {
  id: string;
  userId: string;
  module: UhpModule;
  grantedBy: string | null;
  grantedAt: string;
  fullName: string;
  role: string | null;
  department: string | null;
  position: string | null;
}

export function useUhpAccess(enabled = true) {
  return useQuery({
    queryKey: queryKeys.uhp.access(),
    enabled,
    queryFn: async () => {
      const response = await fetch('/api/uhp/access');
      const payload = await readJson<{ data: UhpAccessResponse }>(
        response,
        'Failed to load UHP access'
      );
      return payload.data;
    },
    staleTime: 60_000,
  });
}

export function useUhpAccessGrants(module: UhpModule, enabled = true) {
  return useQuery({
    queryKey: queryKeys.uhp.accessGrants(module),
    enabled,
    queryFn: async () => {
      const response = await fetch(`/api/uhp/access-grants?module=${module}`);
      return readJson<{ data: UhpAccessGrant[] }>(response, 'Failed to load UHP grants');
    },
  });
}

export function useGrantUhpAccess(module: UhpModule) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch('/api/uhp/access-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, module }),
      });
      return readJson<{ data: UhpAccessGrant[] }>(response, 'Failed to grant UHP access');
    },
    onMutate: async (userId) => {
      const key = queryKeys.uhp.accessGrants(module);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<{ data: UhpAccessGrant[] }>(key);
      return { previous, userId };
    },
    onSuccess: (payload) => {
      client.setQueryData(queryKeys.uhp.accessGrants(module), payload);
      void client.invalidateQueries({ queryKey: queryKeys.uhp.access() });
    },
    onError: (_error, _userId, context) => {
      if (context?.previous) {
        client.setQueryData(queryKeys.uhp.accessGrants(module), context.previous);
      }
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: queryKeys.uhp.accessGrants(module) });
    },
  });
}

export function useRevokeUhpAccess(module: UhpModule) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch('/api/uhp/access-grants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, module }),
      });
      return readJson<{ data: UhpAccessGrant[] }>(response, 'Failed to revoke UHP access');
    },
    onMutate: async (userId) => {
      const key = queryKeys.uhp.accessGrants(module);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<{ data: UhpAccessGrant[] }>(key);
      client.setQueryData<{ data: UhpAccessGrant[] }>(key, (current) => ({
        data: (current?.data ?? []).filter((grant) => grant.userId !== userId),
      }));
      return { previous };
    },
    onSuccess: (payload) => {
      client.setQueryData(queryKeys.uhp.accessGrants(module), payload);
      void client.invalidateQueries({ queryKey: queryKeys.uhp.access() });
    },
    onError: (_error, _userId, context) => {
      if (context?.previous) {
        client.setQueryData(queryKeys.uhp.accessGrants(module), context.previous);
      }
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: queryKeys.uhp.accessGrants(module) });
    },
  });
}
