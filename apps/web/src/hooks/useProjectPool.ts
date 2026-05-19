'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { STALE_TIMES } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';

export type BacklogPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

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

export function useProjectPool() {
  return useQuery({
    queryKey: queryKeys.projects.pool(),
    queryFn: () => jsonFetch<{ items: ProjectBacklogItem[] }>(`/api/projects/backlog`),
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useProjectPoolCount() {
  return useQuery({
    queryKey: queryKeys.projects.poolCount(),
    queryFn: () => jsonFetch<{ count: number }>(`/api/projects/backlog?count=1`),
    staleTime: STALE_TIMES.dynamic,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.pool() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.poolCount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
}
