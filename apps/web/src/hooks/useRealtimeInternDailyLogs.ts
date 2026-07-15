import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  normalizeAttachmentRecords,
  normalizeProjectEntries,
  normalizeStringList,
} from '@/lib/associate-daily-log';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { z } from 'zod';

export interface InternDailyLog {
  id: string;
  internship_id: string;
  log_date: string;
  hours_worked: number;
  tasks_completed: string;
  learnings: string | null;
  challenges: string | null;
  project_entries?: ReturnType<typeof normalizeProjectEntries>;
  blockers?: string[];
  next_steps?: string[];
  attachments?: ReturnType<typeof normalizeAttachmentRecords>;
  supervisor_notes: string | null;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at?: string;
  status?: string;
  // Joined data
  internship?: {
    employee: {
      id: string;
      first_name: string;
      last_name: string;
      user_id: string;
    };
    school: string | null;
    program: string | null;
    department: string;
  };
}

// Zod schema for CDC payload validation
const dailyLogPayloadSchema = z.object({
  id: z.string().uuid(),
  internship_id: z.string().uuid(),
  log_date: z.string(),
  hours_worked: z.number(),
  tasks_completed: z.string(),
  learnings: z.string().nullable().optional(),
  challenges: z.string().nullable().optional(),
  project_entries: z.unknown().optional(),
  attachments: z.unknown().optional(),
  supervisor_notes: z.string().nullable().optional(),
  is_approved: z.boolean(),
  approved_by: z.string().uuid().nullable().optional(),
  approved_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  status: z.string().optional(),
});

function mapRealtimeLog(log: any): InternDailyLog {
  return {
    ...log,
    project_entries: normalizeProjectEntries(log.project_entries, log.tasks_completed),
    blockers: normalizeStringList(undefined, log.challenges),
    next_steps: normalizeStringList(undefined, log.learnings),
    attachments: normalizeAttachmentRecords(log.attachments),
    internship: {
      employee: Array.isArray(log.internships?.employees)
        ? log.internships.employees[0]
        : log.internships?.employees,
      school: log.internships?.school,
      program: log.internships?.program,
      department: log.internships?.department,
    },
  };
}

/**
 * Real-time hook for Associate Daily Logs (EOD Reports)
 *
 * Subscribes to intern_daily_logs table CDC events and invalidates TanStack Query cache.
 * RLS policies ensure only admins can subscribe to this channel.
 *
 * Events monitored:
 * - INSERT: New daily log submitted (associate submits EOD report)
 * - UPDATE: Daily log modified (admin approves/adds notes)
 * - DELETE: Daily log deleted (rare)
 */
export function useRealtimeInternDailyLogs() {
  const [dailyLogs, setDailyLogs] = useState<InternDailyLog[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Initial fetch of all daily logs
    const fetchDailyLogs = async () => {
      const { data, error } = await supabase
        .from('intern_daily_logs')
        .select(
          `
          id,
          internship_id,
          log_date,
          hours_worked,
          tasks_completed,
          learnings,
          challenges,
          project_entries,
          attachments,
          supervisor_notes,
          is_approved,
          approved_by,
          approved_at,
          created_at,
          updated_at,
          status,
          internships!inner(
            id,
            school,
            program,
            department,
            employees!inner(
              id,
              first_name,
              last_name,
              user_id
            )
          )
        `
        )
        .order('log_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Realtime Daily Logs] Error fetching daily logs:', error);
        setError(error.message);
        return;
      }

      // Transform data to match our interface
      const mapped = (data || []).map((log: any) => mapRealtimeLog(log));

      setDailyLogs(mapped);
      console.log(`[Realtime Daily Logs] Loaded ${mapped.length} daily logs`);
    };

    void fetchDailyLogs();

    // Set up realtime subscription for intern_daily_logs table
    const channel = supabase
      .channel('associate-daily-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'intern_daily_logs',
        },
        async (payload: any) => {
          const parseResult = dailyLogPayloadSchema.safeParse(payload.new);
          if (!parseResult.success) {
            console.error('[Realtime Daily Logs] Invalid INSERT payload:', parseResult.error);
            queryClient.invalidateQueries({ queryKey: ['internships'] });
            return;
          }
          console.log('[Realtime Daily Logs] INSERT event:', parseResult.data.id);

          // Fetch the full record with joined data
          const { data: newLog } = await supabase
            .from('intern_daily_logs')
            .select(
              `
              id,
              internship_id,
              log_date,
              hours_worked,
              tasks_completed,
              learnings,
              challenges,
              project_entries,
              attachments,
              supervisor_notes,
              is_approved,
              approved_by,
              approved_at,
              created_at,
              updated_at,
              status,
              internships!inner(
                id,
                school,
                program,
                department,
                employees!inner(
                  id,
                  first_name,
                  last_name,
                  user_id
                )
              )
            `
            )
            .eq('id', parseResult.data.id)
            .single();

          if (newLog) {
            const mapped = mapRealtimeLog(newLog);

            setDailyLogs((prev) => [mapped, ...prev]);
            console.log('[Realtime Daily Logs] Added new daily log to state');
          }

          queryClient.invalidateQueries({ queryKey: ['internships'] });
          queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'intern_daily_logs',
        },
        async (payload: any) => {
          const parseResult = dailyLogPayloadSchema.safeParse(payload.new);
          if (!parseResult.success) {
            console.error('[Realtime Daily Logs] Invalid UPDATE payload:', parseResult.error);
            queryClient.invalidateQueries({ queryKey: ['internships'] });
            return;
          }
          const updatedId = parseResult.data.id;
          console.log('[Realtime Daily Logs] UPDATE event:', updatedId);

          // Fetch the full updated record
          const { data: updatedLog } = await supabase
            .from('intern_daily_logs')
            .select(
              `
              id,
              internship_id,
              log_date,
              hours_worked,
              tasks_completed,
              learnings,
              challenges,
              project_entries,
              attachments,
              supervisor_notes,
              is_approved,
              approved_by,
              approved_at,
              created_at,
              updated_at,
              status,
              internships!inner(
                id,
                school,
                program,
                department,
                employees!inner(
                  id,
                  first_name,
                  last_name,
                  user_id
                )
              )
            `
            )
            .eq('id', updatedId)
            .single();

          if (updatedLog) {
            const mapped = mapRealtimeLog(updatedLog);

            setDailyLogs((prev) => {
              const index = prev.findIndex((log) => log.id === updatedId);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = mapped;
                return updated;
              }
              return [...prev, mapped];
            });
            console.log('[Realtime Daily Logs] Updated daily log in state');
          }

          queryClient.invalidateQueries({ queryKey: ['internships'] });
          queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'intern_daily_logs',
        },
        (payload: any) => {
          const deletedId = (payload.old as any).id;
          console.log('[Realtime Daily Logs] DELETE event:', deletedId);
          setDailyLogs((prev) => prev.filter((log) => log.id !== deletedId));
          queryClient.invalidateQueries({ queryKey: ['internships'] });
          queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime Daily Logs] ✅ Subscription active');
          setIsSubscribed(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime Daily Logs] ❌ Subscription error:', err);
          setError(err?.message || 'Subscription failed');
          setIsSubscribed(false);
        } else if (status === 'TIMED_OUT') {
          console.warn('[Realtime Daily Logs] ⚠️ Subscription timed out');
          setError('Subscription timed out');
          setIsSubscribed(false);
        }
      });

    return () => {
      console.log('[Realtime Daily Logs] 🔌 Unsubscribing...');
      void supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
  }, [queryClient]);

  return { dailyLogs, isSubscribed, error };
}
