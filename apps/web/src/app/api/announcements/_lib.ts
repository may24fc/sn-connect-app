import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getNormalizedMetadataRole, normalizeDbRoleClaim } from '@/lib/auth/role';

export const ANNOUNCEMENT_ADMIN_ROLES = ['admin', 'super_admin'];

interface AnnouncementAudienceTargeting {
  target_roles?: string[];
  target_departments?: string[];
  target_employees?: string[];
}

export function normalizeExcerpt(content: string, excerpt?: string | null) {
  const value = excerpt?.trim();
  if (value && value.length > 0) return value;
  return content.trim().slice(0, 200);
}

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
  let role: string | null = getNormalizedMetadataRole(user.app_metadata);

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

    role = normalizeDbRoleClaim(roleData?.role ?? null);
  }

  return { supabase, user, role, error: null };
}

export function isAnnouncementAdmin(role: string | null) {
  return role ? ANNOUNCEMENT_ADMIN_ROLES.includes(role) : false;
}

export async function resolveAnnouncementTargetUserIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  targeting: AnnouncementAudienceTargeting
): Promise<string[]> {
  const targetRoles = targeting.target_roles ?? [];
  const targetDepartments = targeting.target_departments ?? [];
  const targetEmployees = targeting.target_employees ?? [];

  const hasTargeting =
    targetRoles.length > 0 || targetDepartments.length > 0 || targetEmployees.length > 0;

  if (!hasTargeting) {
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .is('deleted_at', null)
      .neq('status', 'terminated');

    return (users ?? []).map((user: { id: string }) => user.id);
  }

  const userIds = new Set<string>();

  if (targetRoles.length > 0) {
    const { data: usersByRole } = await supabase
      .from('users')
      .select('id')
      .in('role', targetRoles)
      .is('deleted_at', null)
      .neq('status', 'terminated');

    for (const user of usersByRole ?? []) {
      userIds.add(user.id);
    }
  }

  if (targetDepartments.length > 0) {
    const { data: employees } = await supabase
      .from('employees')
      .select('user_id')
      .in('department_id', targetDepartments)
      .is('deleted_at', null)
      .not('user_id', 'is', null);

    for (const employee of employees ?? []) {
      if (employee.user_id) {
        userIds.add(employee.user_id);
      }
    }
  }

  for (const employeeId of targetEmployees) {
    userIds.add(employeeId);
  }

  return Array.from(userIds);
}
