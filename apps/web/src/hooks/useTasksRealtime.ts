'use client';

import { queryKeys } from '@/lib/query-keys';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

interface UseTasksRealtimeOptions {
  scope: 'all' | 'assigned';
  userId?: string;
  enabled?: boolean;
}

interface RealtimeTaskRow {
  assigned_to: string | null;
}

export function useTasksRealtime({ scope, userId, enabled = true }: UseTasksRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const invalidateTaskQueries = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    };

    const channel = supabase
      .channel(`tasks:realtime:${scope}:${userId ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks' },
        (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (scope === 'assigned' && userId) {
            const row = payload.new as unknown as RealtimeTaskRow;
            if (row.assigned_to !== userId) {
              return;
            }
          }

          invalidateTaskQueries();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks' },
        (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (scope === 'assigned' && userId) {
            const previousRow = payload.old as unknown as RealtimeTaskRow;
            const nextRow = payload.new as unknown as RealtimeTaskRow;

            const affected = previousRow.assigned_to === userId || nextRow.assigned_to === userId;

            if (!affected) {
              return;
            }
          }

          invalidateTaskQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, scope, userId]);
}
