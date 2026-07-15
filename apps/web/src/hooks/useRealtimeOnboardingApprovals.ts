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
  role: 'employee' | 'associate';
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

async function fetchPendingApprovals(role?: 'employee' | 'associate'): Promise<PendingOnboarding[]> {
  const params = new URLSearchParams({
    status: 'completed',
    page: '1',
    pageSize: '100',
  });

  if (role) {
    params.set('role', role);
  }

  const response = await fetch(`/api/onboarding/profiles?${params.toString()}`);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Failed to fetch pending approvals' }));
    console.error('Error fetching pending approvals:', error);
    throw new Error('Failed to fetch pending approvals');
  }

  const payload = (await response.json()) as {
    data?: Array<{
      id: string;
      user_id: string;
      full_name: string;
      avatar_url?: string | null;
      email_address: string | null;
      position: string | null;
      department_id?: string | null;
      review_state?: OnboardingReviewState;
      rejection_notes?: string | null;
      rejected_at?: string | null;
      rejected_by?: string | null;
      rejection_count?: number;
      completed_at?: string | null;
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
      payment_account_masked?: string | null;
      payment_city?: string | null;
      payment_province?: string | null;
      payment_zipcode?: string | null;
      users?:
        | { role?: 'employee' | 'associate' | null; avatar_url?: string | null }
        | Array<{ role?: 'employee' | 'associate' | null; avatar_url?: string | null }>;
    }>;
  };

  const mapped: PendingOnboarding[] = (payload.data || []).map((profile) => {
    const userInfo = Array.isArray(profile.users) ? profile.users[0] : profile.users;

    return {
      id: profile.id,
      user_id: profile.user_id,
      full_name: profile.full_name,
      avatar_url: userInfo?.avatar_url ?? null,
      email_address: profile.email_address ?? '',
      role: userInfo?.role || role || 'employee',
      position: profile.position,
      department_id: profile.department_id ?? null,
      review_state: profile.review_state ?? 'awaiting_review',
      rejection_notes: profile.rejection_notes ?? null,
      rejected_at: profile.rejected_at ?? null,
      rejected_by: profile.rejected_by ?? null,
      rejection_count: profile.rejection_count ?? 0,
      completed_at: profile.completed_at ?? profile.created_at,
      created_at: profile.created_at,
      first_name: profile.first_name ?? null,
      middle_name: profile.middle_name ?? null,
      last_name: profile.last_name ?? null,
      birthday: profile.birthday ?? null,
      contact_number: profile.contact_number ?? null,
      address: profile.address ?? null,
      emergency_contact_name: profile.emergency_contact_name ?? null,
      emergency_contact_relationship: profile.emergency_contact_relationship ?? null,
      emergency_contact_number: profile.emergency_contact_number ?? null,
      payment_account_name: profile.payment_account_name ?? null,
      payment_account_number: profile.payment_account_masked ?? null,
      payment_city: profile.payment_city ?? null,
      payment_province: profile.payment_province ?? null,
      payment_zipcode: profile.payment_zipcode ?? null,
    };
  });

  return mapped.filter((profile) => profile.review_state === 'awaiting_review');
}

export function useRealtimeOnboardingApprovals(role?: 'employee' | 'associate') {
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
