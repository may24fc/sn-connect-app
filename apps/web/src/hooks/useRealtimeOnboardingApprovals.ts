import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface PendingOnboarding {
  id: string;
  user_id: string;
  full_name: string;
  email_address: string;
  role: 'employee' | 'intern';
  position: string | null;
  department_id: string | null;
  completed_at: string;
  created_at: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  birthday?: string | null;
  contact_number?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_contact_number?: string | null;
  payment_account_name?: string | null;
  payment_account_number?: string | null;
  payment_city?: string | null;
  payment_province?: string | null;
  payment_zipcode?: string | null;
}

export function useRealtimeOnboardingApprovals(role?: 'employee' | 'intern') {
  const [pendingApprovals, setPendingApprovals] = useState<PendingOnboarding[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Initial fetch of pending approvals
    const fetchPendingApprovals = async () => {
      let query = supabase
        .from('onboarding_profiles')
        .select(`
          id,
          user_id,
          first_name,
          middle_name,
          last_name,
          birthday,
          contact_number,
          address,
          emergency_contact_name,
          emergency_contact_relationship,
          emergency_contact_number,
          email_address,
          position,
          department_id,
          payment_account_name,
          payment_account_number,
          payment_city,
          payment_province,
          payment_zipcode,
          completed_at,
          created_at,
          users!inner(role, status)
        `)
        .eq('is_completed', true)
        .eq('users.status', 'awaiting_approval')
        .is('deleted_at', null)
        .order('completed_at', { ascending: false });

      if (role) {
        query = query.eq('users.role', role);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching pending approvals:', error);
        return;
      }

      const mapped = (data || []).map((profile: any) => {
        const userInfo = Array.isArray(profile.users) ? profile.users[0] : profile.users;
        const maskedPaymentAccount = profile.payment_account_number
          ? `****${String(profile.payment_account_number).slice(-4)}`
          : null;

        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: [profile.first_name, profile.middle_name, profile.last_name]
            .filter(Boolean)
            .join(' '),
          email_address: profile.email_address,
          role: userInfo?.role || 'employee',
          position: profile.position,
          department_id: profile.department_id,
          completed_at: profile.completed_at,
          created_at: profile.created_at,
          first_name: profile.first_name,
          middle_name: profile.middle_name,
          last_name: profile.last_name,
          birthday: profile.birthday,
          contact_number: profile.contact_number,
          address: profile.address,
          emergency_contact_name: profile.emergency_contact_name,
          emergency_contact_relationship: profile.emergency_contact_relationship,
          emergency_contact_number: profile.emergency_contact_number,
          payment_account_name: profile.payment_account_name,
          payment_account_number: maskedPaymentAccount,
          payment_city: profile.payment_city,
          payment_province: profile.payment_province,
          payment_zipcode: profile.payment_zipcode,
        };
      });

      setPendingApprovals(mapped);
    };

    void fetchPendingApprovals();

    // Set up realtime subscription
    const channel = supabase
      .channel('onboarding-approvals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'onboarding_profiles',
          filter: 'is_completed=eq.true',
        },
        () => {
          // Refetch when onboarding_profiles changes
          void fetchPendingApprovals();
          // Also invalidate the main onboarding query
          queryClient.invalidateQueries({ queryKey: ['onboarding', 'profiles'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        (payload: { new: Record<string, unknown> }) => {
          // Remove from local state immediately when status changes from awaiting_approval
          if (payload.new && payload.new['status'] !== 'awaiting_approval') {
            setPendingApprovals((prev) =>
              prev.filter((approval) => approval.user_id !== payload.new['id'])
            );
          }
          // Also refetch to ensure consistency
          void fetchPendingApprovals();
          queryClient.invalidateQueries({ queryKey: ['onboarding', 'profiles'] });
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
  }, [role, queryClient]);

  return { pendingApprovals, isSubscribed };
}
