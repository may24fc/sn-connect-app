'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { STALE_TIMES } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';

export type BacklogPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type ProjectBacklogStatus = 'claimable' | 'archived';

export interface ProjectBacklogItem {
  id: string;
  title: string;
  problem_statement: string;
  objective: string;
  technical_scope: string[];
  target_departments: string[];
  priority: BacklogPriority;
  status: 'claimable' | 'accepted' | 'archived';
  created_at: string;
}

export interface UpdateProjectBacklogInput {
  backlogId: string;
  title: string;
  problemStatement: string;
  objective: string;
  technicalScope: string[];
  targetDepartments: string[];
  priority: BacklogPriority;
}

interface ProjectPoolQueryOptions {
  status?: ProjectBacklogStatus;
  enabled?: boolean;
}

function invalidateProjectPoolQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.pools() });
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function useProjectPool({
  status = 'claimable',
  enabled = true,
}: ProjectPoolQueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.projects.pool(status),
    queryFn: () =>
      jsonFetch<{ items: ProjectBacklogItem[] }>(`/api/projects/backlog?status=${status}`),
    staleTime: STALE_TIMES.dynamic,
    enabled,
  });
}

export function useProjectPoolCount({
  status = 'claimable',
  enabled = true,
}: ProjectPoolQueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.projects.poolCount(status),
    queryFn: () => jsonFetch<{ count: number }>(`/api/projects/backlog?count=1&status=${status}`),
    staleTime: STALE_TIMES.dynamic,
    enabled,
  });
}

export function useClaimProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (backlogId: string) =>
      jsonFetch<{ backlogId: string; projectId: string }>(`/api/projects/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backlogId }),
      }),
    onSuccess: () => {
      invalidateProjectPoolQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
}

export function useUpdateProjectPoolItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ backlogId, ...payload }: UpdateProjectBacklogInput) =>
      jsonFetch<{ data: ProjectBacklogItem }>(`/api/projects/backlog/${backlogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      invalidateProjectPoolQueries(queryClient);
    },
  });
}

export function useRemoveProjectPoolItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (backlogId: string) =>
      jsonFetch<{ ok: true }>(`/api/projects/backlog/${backlogId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      invalidateProjectPoolQueries(queryClient);
    },
  });
}

export function useRestoreProjectPoolItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (backlogId: string) =>
      jsonFetch<{ data: ProjectBacklogItem }>(`/api/projects/backlog/${backlogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'claimable' }),
      }),
    onSuccess: () => {
      invalidateProjectPoolQueries(queryClient);
    },
  });
}
