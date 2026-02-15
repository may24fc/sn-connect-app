import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface OnboardingProfileRecord {
  id: string;
  user_id: string;
  is_completed: boolean;
  current_step: 'personal_info' | 'payment_info' | 'documents' | 'review';
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  position: string | null;
  department_id: string | null;
  start_date: string | null;
  nationality: string | null;
  contact_number: string | null;
  email_address: string | null;
  education: string | null;
  birthday: string | null;
  age: number | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  emergency_contact_relationship: string | null;
  linkedin_profile_url: string | null;
  payment_account_name: string | null;
  payment_account_number: string | null;
  payment_email: string | null;
  payment_phone_number: string | null;
  payment_address: string | null;
  payment_city: string | null;
  payment_province: string | null;
  payment_zipcode: string | null;
  created_at: string;
  updated_at: string;
  full_name?: string;
  status?: 'completed' | 'in_progress';
  payment_account_masked?: string | null;
  users?: { role?: 'employee' | 'intern' | null } | Array<{ role?: 'employee' | 'intern' | null }>;
  departments?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
}

export function useOnboardingProfile(id?: string) {
  const isAdminDetail = typeof id === 'string' && id.length > 0;

  return useQuery({
    queryKey: isAdminDetail
      ? queryKeys.onboarding.profiles.detail(id)
      : queryKeys.onboarding.profile(),
    queryFn: async (): Promise<{ data: OnboardingProfileRecord | null }> => {
      const endpoint = isAdminDetail ? `/api/onboarding/profiles/${id}` : '/api/onboarding/profile';

      const response = await fetch(endpoint);
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to fetch onboarding profile' }));
        throw new Error(error.error || 'Failed to fetch onboarding profile');
      }
      return response.json();
    },
  });
}
