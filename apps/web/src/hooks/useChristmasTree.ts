import type { buildChristmasTreeSnapshot } from '@/app/api/christmas-tree/_lib';
import { STALE_TIMES } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  ChristmasOrnamentMoveInput,
  ChristmasOrnamentPlacementInput,
  ChristmasWishDeleteInput,
  ChristmasWishUpsertInput,
} from '@/lib/schemas/christmas-tree.schema';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

export type ChristmasTreeSnapshot = Awaited<ReturnType<typeof buildChristmasTreeSnapshot>>;

const RECENT_LOCAL_MUTATION_WINDOW_MS = 2_000;
const localSnapshotUpdatedAt = new WeakMap<QueryClient, number>();

function cacheLocalMutationSnapshot(queryClient: QueryClient, data: ChristmasTreeSnapshot) {
  queryClient.setQueryData(queryKeys.christmasTree.current(), data);
  localSnapshotUpdatedAt.set(queryClient, Date.now());
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body.data as T;
}

export function useChristmasTree() {
  return useQuery({
    queryKey: queryKeys.christmasTree.current(),
    queryFn: () => fetchJson<ChristmasTreeSnapshot>('/api/christmas-tree/current'),
    staleTime: STALE_TIMES.dynamic,
  });
}

export function usePlaceChristmasOrnament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChristmasOrnamentPlacementInput) =>
      fetchJson<ChristmasTreeSnapshot>('/api/christmas-tree/ornament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onMutate: async (payload) => {
      const queryKey = queryKeys.christmasTree.current();
      await queryClient.cancelQueries({ queryKey });
      const previousSnapshot = queryClient.getQueryData<ChristmasTreeSnapshot>(queryKey);
      queryClient.setQueryData<ChristmasTreeSnapshot>(queryKey, (old) => {
        if (!old || old.myOrnament) return old;
        const id = `optimistic-ornament-${crypto.randomUUID()}`;
        return {
          ...old,
          myOrnament: {
            id,
            user_id: 'optimistic-current-user',
            asset_type: payload.assetType,
            position_x: payload.positionX,
            position_y: payload.positionY,
          },
          ornaments: [
            ...old.ornaments,
            {
              id,
              ownerName: 'You',
              assetType: payload.assetType,
              positionX: payload.positionX,
              positionY: payload.positionY,
              wishes: [],
            },
          ],
        };
      });
      return { previousSnapshot };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKeys.christmasTree.current(), context?.previousSnapshot);
    },
    onSuccess: (data) => cacheLocalMutationSnapshot(queryClient, data),
  });
}

export function useDeleteChristmasOrnament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<ChristmasTreeSnapshot>('/api/christmas-tree/ornament', { method: 'DELETE' }),
    onMutate: async () => {
      const queryKey = queryKeys.christmasTree.current();
      await queryClient.cancelQueries({ queryKey });
      const previousSnapshot = queryClient.getQueryData<ChristmasTreeSnapshot>(queryKey);
      queryClient.setQueryData<ChristmasTreeSnapshot>(queryKey, (old) =>
        old?.myOrnament
          ? {
              ...old,
              myOrnament: null,
              ornaments: old.ornaments.filter((ornament) => ornament.id !== old.myOrnament?.id),
            }
          : old
      );
      return { previousSnapshot };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKeys.christmasTree.current(), context?.previousSnapshot);
    },
    onSuccess: (data) => cacheLocalMutationSnapshot(queryClient, data),
  });
}

export function useMoveChristmasOrnament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChristmasOrnamentMoveInput) =>
      fetchJson<ChristmasTreeSnapshot>('/api/christmas-tree/ornament', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onMutate: async (payload) => {
      const queryKey = queryKeys.christmasTree.current();
      await queryClient.cancelQueries({ queryKey });
      const previousSnapshot = queryClient.getQueryData<ChristmasTreeSnapshot>(queryKey);
      queryClient.setQueryData<ChristmasTreeSnapshot>(queryKey, (old) =>
        old?.myOrnament
          ? {
              ...old,
              ornaments: old.ornaments.map((ornament) =>
                ornament.id === old.myOrnament?.id
                  ? { ...ornament, positionX: payload.positionX, positionY: payload.positionY }
                  : ornament
              ),
            }
          : old
      );
      return { previousSnapshot };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKeys.christmasTree.current(), context?.previousSnapshot);
    },
    onSuccess: (data) => cacheLocalMutationSnapshot(queryClient, data),
  });
}

export function useUpsertChristmasWish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChristmasWishUpsertInput) =>
      fetchJson<ChristmasTreeSnapshot>('/api/christmas-tree/wishes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onMutate: async (payload) => {
      const queryKey = queryKeys.christmasTree.current();
      await queryClient.cancelQueries({ queryKey });
      const previousSnapshot = queryClient.getQueryData<ChristmasTreeSnapshot>(queryKey);
      queryClient.setQueryData<ChristmasTreeSnapshot>(queryKey, (old) => {
        if (!old?.myOrnament) return old;
        return {
          ...old,
          ornaments: old.ornaments.map((ornament) =>
            ornament.id !== old.myOrnament?.id
              ? ornament
              : {
                  ...ornament,
                  wishes: [
                    ...ornament.wishes.filter(
                      (wish) =>
                        wish.category !== payload.category ||
                        wish.item_number !== payload.itemNumber
                    ),
                    {
                      ornament_id: old.myOrnament.id,
                      category: payload.category,
                      item_number: payload.itemNumber,
                      content: payload.content,
                      submitted_at: new Date().toISOString(),
                    },
                  ],
                }
          ),
        };
      });
      return { previousSnapshot };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKeys.christmasTree.current(), context?.previousSnapshot);
    },
    onSuccess: (data) => cacheLocalMutationSnapshot(queryClient, data),
  });
}

export function useDeleteChristmasWish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChristmasWishDeleteInput) =>
      fetchJson<ChristmasTreeSnapshot>('/api/christmas-tree/wishes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onMutate: async (payload) => {
      const queryKey = queryKeys.christmasTree.current();
      await queryClient.cancelQueries({ queryKey });
      const previousSnapshot = queryClient.getQueryData<ChristmasTreeSnapshot>(queryKey);
      queryClient.setQueryData<ChristmasTreeSnapshot>(queryKey, (old) =>
        old?.myOrnament
          ? {
              ...old,
              ornaments: old.ornaments.map((ornament) =>
                ornament.id === old.myOrnament?.id
                  ? {
                      ...ornament,
                      wishes: ornament.wishes.filter(
                        (wish) =>
                          wish.category !== payload.category ||
                          wish.item_number !== payload.itemNumber
                      ),
                    }
                  : ornament
              ),
            }
          : old
      );
      return { previousSnapshot };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKeys.christmasTree.current(), context?.previousSnapshot);
    },
    onSuccess: (data) => cacheLocalMutationSnapshot(queryClient, data),
  });
}

export function useChristmasTreeRealtime(
  enabled = true
): 'connected' | 'connecting' | 'fallback' | 'unavailable' {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'connected' | 'connecting' | 'fallback' | 'unavailable'>(
    'connecting'
  );
  const invalidationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshWhenVisibleRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus('unavailable');
      return;
    }

    const refresh = (ignoreRecentLocalMutation = false) => {
      if (document.visibilityState === 'hidden') {
        refreshWhenVisibleRef.current = true;
        return;
      }
      const recentlyUpdatedLocally =
        Date.now() - (localSnapshotUpdatedAt.get(queryClient) ?? 0) <
        RECENT_LOCAL_MUTATION_WINDOW_MS;
      if (!ignoreRecentLocalMutation && recentlyUpdatedLocally) return;

      refreshWhenVisibleRef.current = false;
      void queryClient.invalidateQueries(
        { queryKey: queryKeys.christmasTree.current(), refetchType: 'active' },
        { cancelRefetch: false }
      );
    };
    const invalidate = () => {
      if (invalidationTimerRef.current) clearTimeout(invalidationTimerRef.current);
      invalidationTimerRef.current = setTimeout(() => {
        refresh();
      }, 300);
    };
    const startFallbackPolling = () => {
      if (fallbackTimerRef.current) return;
      fallbackTimerRef.current = setInterval(invalidate, 30_000);
    };
    const stopFallbackPolling = () => {
      if (!fallbackTimerRef.current) return;
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && refreshWhenVisibleRef.current) refresh(true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const channel = supabase
      .channel('christmas-tree:realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'christmas_ornaments' },
        invalidate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'christmas_wishes' },
        invalidate
      )
      .subscribe((nextStatus: REALTIME_SUBSCRIBE_STATES) => {
        if (nextStatus === 'SUBSCRIBED') {
          stopFallbackPolling();
          setStatus('connected');
          return;
        }
        if (
          nextStatus === 'CHANNEL_ERROR' ||
          nextStatus === 'TIMED_OUT' ||
          nextStatus === 'CLOSED'
        ) {
          startFallbackPolling();
          setStatus('fallback');
          return;
        }
        setStatus('connecting');
      });

    return () => {
      if (invalidationTimerRef.current) clearTimeout(invalidationTimerRef.current);
      stopFallbackPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  return status;
}
