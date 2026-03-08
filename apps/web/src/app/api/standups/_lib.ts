import { createSupabaseServerClient } from '@/lib/supabase/server';

export const STANDUP_ADMIN_ROLES = ['admin', 'hr', 'cos', 'ceo'];

export async function getAuthedSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, role: null, error: 'Unauthorized' as const };
  }

  // Primary: read role from app_metadata (embedded in JWT, no DB call needed)
  let role: string | null = null;
  if (typeof user.app_metadata?.db_role === 'string') {
    role = user.app_metadata.db_role;
  }

  // Fallback: query public.users table
  if (!role) {
    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (roleError) {
      return { supabase, user, role: null, error: 'Failed to resolve user role' as const };
    }

    role = roleData?.role ?? null;
  }

  return { supabase, user, role, error: null };
}

export function isStandupAdmin(role: string | null): boolean {
  return role !== null && STANDUP_ADMIN_ROLES.includes(role);
}
