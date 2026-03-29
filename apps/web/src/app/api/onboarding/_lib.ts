import { createSupabaseServerClient } from '@/lib/supabase/server';

export const ONBOARDING_ADMIN_ROLES = ['admin', 'super_admin'];

export function isOnboardingAdmin(role: string | null): boolean {
  return role ? ONBOARDING_ADMIN_ROLES.includes(role) : false;
}

export function maskPaymentAccount(value: string | null): string | null {
  if (!value) return null;
  const visible = value.slice(-4);
  return `****${visible}`;
}

export function isMissingOnboardingChecklistsTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? error.code : null;
  const message = 'message' in error ? error.message : null;

  return (
    code === 'PGRST205' &&
    typeof message === 'string' &&
    message.includes("public.onboarding_checklists")
  );
}

export async function getAuthedOnboardingContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Auth error in getAuthedOnboardingContext:', error);
    return { supabase, user: null, role: null, error: 'Unauthorized' as const };
  }

  if (!user) {
    return { supabase, user: null, role: null, error: 'Unauthorized' as const };
  }

  let role: string | null = null;
  if (typeof user.app_metadata?.db_role === 'string') {
    role = user.app_metadata.db_role;
  }

  if (!role) {
    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (roleError) {
      console.error('Role fetch error in getAuthedOnboardingContext:', roleError);
      return {
        supabase,
        user,
        role: null,
        error: 'Failed to resolve user role' as const,
      };
    }

    role = roleData?.role ?? null;
  }

  return { supabase, user, role, error: null };
}
