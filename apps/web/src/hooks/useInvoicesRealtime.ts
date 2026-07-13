'use client';

import { queryKeys } from '@/lib/query-keys';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

interface UseInvoicesRealtimeOptions {
  enabled?: boolean;
}

const INVALIDATION_DEBOUNCE_MS = 300;

export function useInvoicesRealtime({ enabled = true }: UseInvoicesRealtimeOptions = {}): void {
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateInvoiceQueries = useCallback((): void => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payroll.all });
    }, INVALIDATION_DEBOUNCE_MS);
  }, [queryClient]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel('invoices:realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'invoices' }, () => {
        invalidateInvoiceQueries();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'invoices' }, () => {
        invalidateInvoiceQueries();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'invoices' }, () => {
        invalidateInvoiceQueries();
      })
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [enabled, invalidateInvoiceQueries]);
}