'use client';

import { queryKeys } from '@/lib/query-keys';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

interface UseRealtimeApplicationsOptions {
  applicationId?: string | null;
  enabled?: boolean;
}

interface ApplicationChangePayload {
  new: {
    id?: string | null;
  };
  old: {
    id?: string | null;
  };
}

export function useRealtimeApplications({
  applicationId,
  enabled = true,
}: UseRealtimeApplicationsOptions = {}): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const invalidateApplicationQueries = (payload?: ApplicationChangePayload): void => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.lists() });

      const affectedId = payload?.new.id ?? payload?.old.id ?? null;
      if (affectedId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.applications.detail(affectedId),
        });
      }

      if (applicationId && applicationId !== affectedId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.applications.detail(applicationId),
        });
      }
    };

    const channel = supabase
      .channel(`applications:realtime:${applicationId ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_applications' },
        (payload: ApplicationChangePayload) => {
          invalidateApplicationQueries(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'job_applications' },
        (payload: ApplicationChangePayload) => {
          invalidateApplicationQueries(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'job_applications' },
        (payload: ApplicationChangePayload) => {
          invalidateApplicationQueries(payload);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applicationId, enabled, queryClient]);
}