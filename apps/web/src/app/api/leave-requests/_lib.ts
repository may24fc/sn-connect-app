import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;

export interface LeaveAuthedContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  user: { id: string; app_metadata?: Record<string, unknown> };
  role: string | null;
}

export async function getLeaveAuthedContext(): Promise<
  { ok: true; context: LeaveAuthedContext } | { ok: false; status: number; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  let role: string | null =
    typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;

  if (!role) {
    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (roleError) {
      return { ok: false, status: 500, error: 'Failed to resolve user role' };
    }
    role = roleData?.role ?? null;
  }

  return { ok: true, context: { supabase, supabaseAdmin, user, role } };
}

export function isAdminRole(role: string | null): boolean {
  return role !== null && (ADMIN_ROLES as readonly string[]).includes(role);
}
