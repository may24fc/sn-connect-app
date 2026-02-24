import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { z } from 'zod';

export interface ProbationEmployee {
  id: string;
  user_id: string;
  employee_number: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  position: string;
  department: string;
  date_hired: string;
  probation_end_date: string | null;
  employment_type: string;
  company_email: string | null;
  deleted_at?: string | null;
}

// Zod schema for CDC payload validation (type safety at the boundary)
const employeePayloadSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  employee_number: z.string(),
  first_name: z.string(),
  middle_name: z.string().nullable().optional(),
  last_name: z.string(),
  position: z.string(),
  department: z.string(),
  date_hired: z.string(),
  probation_end_date: z.string().nullable().optional(),
  employment_type: z.string(),
  company_email: z.string().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
});

/**
 * Real-time hook for Probation Tracker
 *
 * Subscribes to employees table CDC events and invalidates TanStack Query cache.
 * RLS policies ensure only admins can subscribe to this channel.
 *
 * Events monitored:
 * - INSERT: New employee created (e.g., from onboarding approval)
 * - UPDATE: Employee record modified (e.g., probation extended)
 * - DELETE: Employee soft-deleted
 */
export function useRealtimeProbationEmployees() {
  const [employees, setEmployees] = useState<ProbationEmployee[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Initial fetch of probationary employees
    const fetchProbationEmployees = async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(
          `
          id,
          user_id,
          employee_number,
          first_name,
          middle_name,
          last_name,
          position,
          department,
          date_hired,
          probation_end_date,
          employment_type,
          company_email
        `
        )
        .not('probation_end_date', 'is', null)
        .gte('probation_end_date', new Date().toISOString().split('T')[0])
        .is('deleted_at', null)
        .order('probation_end_date', { ascending: true });

      if (error) {
        console.error('[Realtime Probation] Error fetching probation employees:', error);
        setError(error.message);
        return;
      }

      setEmployees(data || []);
      console.log(`[Realtime Probation] Loaded ${data?.length || 0} probationary employees`);
    };

    void fetchProbationEmployees();

    // Set up realtime subscription for employees table
    const channel = supabase
      .channel('probation-employees')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'employees',
        },
        (payload: any) => {
          const parseResult = employeePayloadSchema.safeParse(payload.new);
          if (!parseResult.success) {
            console.error('[Realtime Probation] Invalid INSERT payload:', parseResult.error);
            return;
          }
          const newEmployee = parseResult.data as ProbationEmployee;
          console.log('[Realtime Probation] INSERT event:', newEmployee.employee_number);
          if (
            newEmployee.probation_end_date &&
            new Date(newEmployee.probation_end_date) >= new Date() &&
            !newEmployee.deleted_at
          ) {
            setEmployees((prev) =>
              [...prev, newEmployee].sort(
                (a, b) =>
                  new Date(a.probation_end_date!).getTime() -
                  new Date(b.probation_end_date!).getTime()
              )
            );
          }
          // Invalidate queries to ensure consistency
          queryClient.invalidateQueries({ queryKey: ['probation'] });
          queryClient.invalidateQueries({ queryKey: ['employees'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'employees',
        },
        (payload: any) => {
          const parseResult = employeePayloadSchema.safeParse(payload.new);
          if (!parseResult.success) {
            console.error('[Realtime Probation] Invalid UPDATE payload:', parseResult.error);
            return;
          }
          const updatedEmployee = parseResult.data as ProbationEmployee;
          console.log('[Realtime Probation] UPDATE event:', updatedEmployee.employee_number);

          // Update or remove based on probation_end_date
          setEmployees((prev) => {
            const shouldInclude =
              updatedEmployee.probation_end_date &&
              new Date(updatedEmployee.probation_end_date) >= new Date() &&
              !updatedEmployee.deleted_at;

            if (shouldInclude) {
              const index = prev.findIndex((e) => e.id === updatedEmployee.id);
              if (index >= 0) {
                // Update existing
                const updated = [...prev];
                updated[index] = updatedEmployee;
                return updated.sort(
                  (a, b) =>
                    new Date(a.probation_end_date!).getTime() -
                    new Date(b.probation_end_date!).getTime()
                );
              }
              // Add new
              return [...prev, updatedEmployee].sort(
                (a, b) =>
                  new Date(a.probation_end_date!).getTime() -
                  new Date(b.probation_end_date!).getTime()
              );
            }
            // Remove if no longer on probation
            return prev.filter((e) => e.id !== updatedEmployee.id);
          });

          queryClient.invalidateQueries({ queryKey: ['probation'] });
          queryClient.invalidateQueries({ queryKey: ['employees'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'employees',
        },
        (payload: any) => {
          const deletedId = (payload.old as any).id;
          console.log('[Realtime Probation] DELETE event:', deletedId);
          setEmployees((prev) => prev.filter((e) => e.id !== deletedId));
          queryClient.invalidateQueries({ queryKey: ['probation'] });
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime Probation] ✅ Subscription active');
          setIsSubscribed(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime Probation] ❌ Subscription error:', err);
          setError(err?.message || 'Subscription failed');
          setIsSubscribed(false);
        } else if (status === 'TIMED_OUT') {
          console.warn('[Realtime Probation] ⚠️ Subscription timed out');
          setError('Subscription timed out');
          setIsSubscribed(false);
        }
      });

    return () => {
      console.log('[Realtime Probation] 🔌 Unsubscribing...');
      void supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
  }, [queryClient]);

  return { employees, isSubscribed, error };
}
