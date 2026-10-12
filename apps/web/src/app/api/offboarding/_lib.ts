import { normalizeDbRoleClaim } from '@/lib/auth/role';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const OFFBOARDING_ADMIN_ROLES = ['admin', 'super_admin'];

export function isOffboardingAdmin(role: string | null): boolean {
  return role ? OFFBOARDING_ADMIN_ROLES.includes(role) : false;
}

export function isMissingOffboardingTableError(
  error: unknown,
  tableName: 'offboarding' | 'offboarding_tasks'
): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? error.code : null;
  const message = 'message' in error ? error.message : null;

  return (
    code === 'PGRST205' &&
    typeof message === 'string' &&
    message.includes(`public.${tableName}`)
  );
}

export async function getAuthedOffboardingContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Auth error in getAuthedOffboardingContext:', error);
    return { supabase, user: null, role: null, error: 'Unauthorized' as const };
  }

  if (!user) {
    return { supabase, user: null, role: null, error: 'Unauthorized' as const };
  }

  const { data: roleData, error: roleError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (roleError) {
    console.error('Role fetch error in getAuthedOffboardingContext:', roleError);
    return {
      supabase,
      user,
      role: null,
      error: 'Failed to resolve user role' as const,
    };
  }

  const role = normalizeDbRoleClaim(roleData?.role ?? null);
  if (!role) {
    return { supabase, user: null, role: null, error: 'Unauthorized' as const };
  }

  return { supabase, user, role, error: null };
}