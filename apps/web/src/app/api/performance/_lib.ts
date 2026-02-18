import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export const PERFORMANCE_ADMIN_ROLES = ['admin', 'super_admin'];

export function isPerformanceAdmin(role: string | null): boolean {
  return role ? PERFORMANCE_ADMIN_ROLES.includes(role) : false;
}

export function toUiReviewStatus(status: string | null):
  | 'pending_self'
  | 'pending_manager'
  | 'pending_hr'
  | 'completed' {
  if (status === 'pending') return 'pending_self';
  if (status === 'self_review') return 'pending_manager';
  if (status === 'manager_review') return 'pending_hr';
  if (status === 'completed') return 'completed';
  return 'pending_self';
}

export function toUiCycleStatus(status: string | null): 'draft' | 'active' | 'closed' {
  if (status === 'active') return 'active';
  if (status === 'draft') return 'draft';
  return 'closed';
}

export async function resolveEmployeeIdForUser(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}

export async function getAuthedPerformanceContext() {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, supabaseAdmin, user: null, role: null, error: 'Unauthorized' as const };
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
      return {
        supabase,
        supabaseAdmin,
        user,
        role: null,
        error: 'Failed to resolve user role' as const,
      };
    }

    role = roleData?.role ?? null;
  }

  return { supabase, supabaseAdmin, user, role, error: null };
}
