import { normalizeDbRoleClaim } from '@/lib/auth/role';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const STANDUP_ADMIN_ROLES = ['admin', 'super_admin'];

export async function getAuthedSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, role: null, error: 'Unauthorized' as const };
  }

  const { data: roleData, error: roleError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (roleError) {
    return { supabase, user, role: null, error: 'Failed to resolve user role' as const };
  }

  const role = normalizeDbRoleClaim(roleData?.role ?? null);
  if (!role) {
    return { supabase, user: null, role: null, error: 'Unauthorized' as const };
  }

  return { supabase, user, role, error: null };
}

export function isStandupAdmin(role: string | null): boolean {
  return role !== null && STANDUP_ADMIN_ROLES.includes(role);
}
