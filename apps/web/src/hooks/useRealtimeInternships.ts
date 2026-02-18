import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

export interface ActiveInternship {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  required_hours: number;
  completed_hours: number;
  status: 'active' | 'completed' | 'terminated' | 'converted';
  supervisor_id: string | null;
  department: string;
  school: string | null;
  program: string | null;
  employee: {
    id: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    company_email: string | null;
    user_id: string;
  } | null;
}

// Zod schema for CDC payload validation
const internshipPayloadSchema = z.object({
  id: z.string().uuid(),
  employee_id: z.string().uuid(),
  start_date: z.string(),
  end_date: z.string(),
  required_hours: z.number(),
  completed_hours: z.number(),
  status: z.enum(['active', 'completed', 'terminated', 'converted']),
  supervisor_id: z.string().uuid().nullable().optional(),
  department: z.string(),
  school: z.string().nullable().optional(),
  program: z.string().nullable().optional(),
});

/**
 * Real-time hook for Active Internships
 * 
 * Subscribes to internships table CDC events and invalidates TanStack Query cache.
 * RLS policies ensure only admins can subscribe to this channel.
 * 
 * Events monitored:
 * - INSERT: New internship created (e.g., from intern assignment)
 * - UPDATE: Internship modified (e.g., hours logged, supervisor assigned)
 * - DELETE: Internship deleted
 */
export function useRealtimeInternships() {
  const [internships, setInternships] = useState<ActiveInternship[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Initial fetch of active internships
    const fetchInternships = async () => {
      const { data, error } = await supabase
        .from('internships')
        .select(
          `
          id,
          employee_id,
          start_date,
          end_date,
          required_hours,
          completed_hours,
          status,
          supervisor_id,
          department,
          school,
          program,
          employees!inner(
            id,
            first_name,
            middle_name,
            last_name,
            company_email,
            user_id
          )
        `
        )
        .in('status', ['active', 'completed', 'converted'])
        .order('start_date', { ascending: false });

      if (error) {
        console.error('[Realtime Internships] Error fetching internships:', error);
        setError(error.message);
        return;
      }

      // Transform data to match our interface
      const mapped = (data || []).map((internship: any) => ({
        ...internship,
        employee: Array.isArray(internship.employees)
          ? internship.employees[0]
          : internship.employees,
      }));

      setInternships(mapped);
      console.log(`[Realtime Internships] Loaded ${mapped.length} active internships`);
    };

    void fetchInternships();

    // Set up realtime subscription for internships table
    const channel = supabase
      .channel('internships-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internships',
        },
        async (payload: any) => {
          const parseResult = internshipPayloadSchema.safeParse(payload.new);
          if (!parseResult.success) {
            console.error('[Realtime Internships] Invalid INSERT payload:', parseResult.error);
            queryClient.invalidateQueries({ queryKey: ['internships'] });
            return;
          }
          console.log('[Realtime Internships] INSERT event:', parseResult.data.id);
          // Fetch the full record with employee data
          const { data: newInternship } = await supabase
            .from('internships')
            .select(
              `
              id,
              employee_id,
              start_date,
              end_date,
              required_hours,
              completed_hours,
              status,
              supervisor_id,
              department,
              school,
              program,
              employees!inner(
                id,
                first_name,
                middle_name,
                last_name,
                company_email,
                user_id
              )
            `
            )
            .eq('id', (payload.new as any).id)
            .single();

          if (newInternship) {
            const mapped = {
              ...newInternship,
              employee: Array.isArray(newInternship.employees)
                ? newInternship.employees[0]
                : newInternship.employees,
            };

            setInternships((prev) => [mapped, ...prev]);
            console.log('[Realtime Internships] Added new internship to state');
          }

          queryClient.invalidateQueries({ queryKey: ['internships'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'internships',
        },
        async (payload: any) => {
          const parseResult = internshipPayloadSchema.safeParse(payload.new);
          if (!parseResult.success) {
            console.error('[Realtime Internships] Invalid UPDATE payload:', parseResult.error);
            queryClient.invalidateQueries({ queryKey: ['internships'] });
            return;
          }
          const updatedId = parseResult.data.id;
          console.log('[Realtime Internships] UPDATE event:', updatedId);

          // Fetch the full updated record
          const { data: updatedInternship } = await supabase
            .from('internships')
            .select(
              `
              id,
              employee_id,
              start_date,
              end_date,
              required_hours,
              completed_hours,
              status,
              supervisor_id,
              department,
              school,
              program,
              employees!inner(
                id,
                first_name,
                middle_name,
                last_name,
                company_email,
                user_id
              )
            `
            )
            .eq('id', updatedId)
            .single();

          if (updatedInternship) {
            const mapped = {
              ...updatedInternship,
              employee: Array.isArray(updatedInternship.employees)
                ? updatedInternship.employees[0]
                : updatedInternship.employees,
            };

            setInternships((prev) => {
              const index = prev.findIndex((i) => i.id === updatedId);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = mapped;
                return updated;
              }
              return [...prev, mapped];
            });
            console.log('[Realtime Internships] Updated internship in state');
          }

          queryClient.invalidateQueries({ queryKey: ['internships'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'internships',
        },
        (payload: any) => {
          const deletedId = (payload.old as any).id;
          console.log('[Realtime Internships] DELETE event:', deletedId);
          setInternships((prev) => prev.filter((i) => i.id !== deletedId));
          queryClient.invalidateQueries({ queryKey: ['internships'] });
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime Internships] ✅ Subscription active');
          setIsSubscribed(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime Internships] ❌ Subscription error:', err);
          setError(err?.message || 'Subscription failed');
          setIsSubscribed(false);
        } else if (status === 'TIMED_OUT') {
          console.warn('[Realtime Internships] ⚠️ Subscription timed out');
          setError('Subscription timed out');
          setIsSubscribed(false);
        }
      });

    return () => {
      console.log('[Realtime Internships] 🔌 Unsubscribing...');
      void supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
  }, [queryClient]);

  return { internships, isSubscribed, error };
}
