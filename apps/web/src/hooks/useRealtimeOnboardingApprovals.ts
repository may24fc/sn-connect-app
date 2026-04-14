import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import type { OnboardingReviewState } from '@/lib/onboarding-review-state';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export interface PendingOnboarding {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  email_address: string;
  role: 'employee' | 'intern';
  position: string | null;
  department_id: string | null;
  completed_at: string;
  created_at: string;
  review_state?: OnboardingReviewState;
  rejection_notes?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
  rejection_count?: number;
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

async function fetchPendingApprovals(role?: 'employee' | 'intern'): Promise<PendingOnboarding[]> {
  const supabase = createSupabaseBrowserClient();

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
      review_state,
      rejection_notes,
      rejected_at,
      rejected_by,
      rejection_count,
      completed_at,
      created_at,
      users!inner(role, status, avatar_url)
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
    throw new Error('Failed to fetch pending approvals');
  }

  const mapped: PendingOnboarding[] = (data || []).map((profile: any) => {
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
      avatar_url: userInfo?.avatar_url ?? null,
      email_address: profile.email_address,
      role: userInfo?.role || 'employee',
      position: profile.position,
      department_id: profile.department_id,
      review_state:
        userInfo?.status === 'active'
          ? 'approved'
          : profile.review_state === 'rejected'
            ? 'rejected'
            : 'awaiting_review',
      rejection_notes: profile.rejection_notes,
      rejected_at: profile.rejected_at,
      rejected_by: profile.rejected_by,
      rejection_count: profile.rejection_count ?? 0,
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

  return mapped.filter((profile) => profile.review_state !== 'rejected');
}

export function useRealtimeOnboardingApprovals(role?: 'employee' | 'intern') {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const queryClient = useQueryClient();
  const pendingApprovalsQuery = useQuery({
    queryKey: queryKeys.onboarding.pendingApprovals(role),
    queryFn: () => fetchPendingApprovals(role),
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

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
          queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.pendingApprovals(role) });
          queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.profiles.all() });
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
          if (payload.new && payload.new['status'] !== 'awaiting_approval') {
            queryClient.setQueryData<PendingOnboarding[]>(
              queryKeys.onboarding.pendingApprovals(role),
              (current) =>
                (current ?? []).filter((approval) => approval.user_id !== payload.new['id'])
            );
          }
          queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.pendingApprovals(role) });
          queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.profiles.all() });
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

  return {
    pendingApprovals: pendingApprovalsQuery.data ?? [],
    isSubscribed,
    isLoading: pendingApprovalsQuery.isLoading,
  };
}
