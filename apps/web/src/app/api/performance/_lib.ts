import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export const PERFORMANCE_ADMIN_ROLES: readonly string[] = ['admin', 'super_admin'];
export const PERFORMANCE_MANAGER_ROLES: readonly string[] = [
  'admin',
  'hr',
  'cos',
  'ceo',
  'super_admin',
] as const;

export function isPerformanceAdmin(role: string | null): boolean {
  return role ? PERFORMANCE_ADMIN_ROLES.includes(role) : false;
}

export function canManagePerformance(role: string | null): boolean {
  return role ? PERFORMANCE_MANAGER_ROLES.includes(role) : false;
}

export function toUiReviewStatus(
  status: string | null
): 'pending_self' | 'pending_manager' | 'pending_hr' | 'completed' {
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

export async function resolveEmployeeIdForUser(
  supabase: any,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}

type PerformanceIdentityUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export type PerformanceIdentitySnapshot = {
  fullName: string;
  departmentRole: string;
};

function formatRoleLabel(role: string | null): string {
  if (!role) {
    return 'Unassigned';
  }

  return role
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function resolveMetadataFullName(user: PerformanceIdentityUser): string {
  const metadata = user.user_metadata ?? {};
  if (typeof metadata.full_name === 'string' && metadata.full_name.trim()) {
    return metadata.full_name.trim();
  }

  const firstName = typeof metadata.first_name === 'string' ? metadata.first_name.trim() : '';
  const lastName = typeof metadata.last_name === 'string' ? metadata.last_name.trim() : '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  if (fullName) {
    return fullName;
  }

  if (typeof user.email === 'string' && user.email.includes('@')) {
    return user.email.split('@')[0] ?? 'Unknown user';
  }

  return 'Unknown user';
}

export async function resolvePerformanceIdentitySnapshot(
  supabase: any,
  user: PerformanceIdentityUser,
  role: string | null
): Promise<PerformanceIdentitySnapshot> {
  const { data } = await supabase
    .from('employee_directory')
    .select('full_name, department_name, position')
    .eq('user_id', user.id)
    .maybeSingle();

  const fullName =
    typeof data?.full_name === 'string' && data.full_name.trim()
      ? data.full_name.trim()
      : resolveMetadataFullName(user);

  const departmentRole =
    typeof data?.department_name === 'string' && data.department_name.trim()
      ? data.department_name.trim()
      : typeof data?.position === 'string' && data.position.trim()
        ? data.position.trim()
        : formatRoleLabel(role);

  return {
    fullName,
    departmentRole,
  };
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
