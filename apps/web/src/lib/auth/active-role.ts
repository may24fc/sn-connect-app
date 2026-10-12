import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { normalizeDbRoleClaim, type KnownDbRole } from '@/lib/auth/role';

/** Resolve authorization from the current, non-deleted user row. Auth claims can outlive deletion or role changes. */
export async function getActiveUserRole(userId: string): Promise<KnownDbRole | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from('users')
    .select('role')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return normalizeDbRoleClaim(data?.role);
}
