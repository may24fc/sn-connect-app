import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { getNormalizedMetadataRole, normalizeDbRoleClaim } from '@/lib/auth/role';

export const INTERNSHIP_ADMIN_ROLES = ['admin', 'super_admin', 'hr', 'cos', 'ceo'];

export function isInternshipAdmin(role: string | null): boolean {
  return role ? INTERNSHIP_ADMIN_ROLES.includes(role) : false;
}

export async function getAuthedInternshipContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, role: null, error: 'Unauthorized' as const };
  }

  let role: string | null = getNormalizedMetadataRole(user.app_metadata);

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
        user,
        role: null,
        error: 'Failed to resolve user role' as const,
      };
    }

    role = normalizeDbRoleClaim(roleData?.role ?? null);
  }

  return { supabase, user, role, error: null };
}

export async function resolveEmployeeByUserId(supabase: any, userId: string) {
  return supabase
    .from('employees')
    .select(
      'id, user_id, first_name, last_name, company_email, department, position, immediate_head'
    )
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
}

export async function canAccessInternship(
  _supabase: any,
  internshipId: string,
  userId: string,
  role: string | null
): Promise<{
  allowed: boolean;
  internship: Record<string, unknown> | null;
  employeeId: string | null;
}> {
  const adminClient = createSupabaseAdminClient();

  const { data: internshipById, error: internshipError } = await adminClient
    .from('internships')
    .select('*')
    .eq('id', internshipId)
    .is('deleted_at', null)
    .maybeSingle();

  if (internshipError) {
    return { allowed: false, internship: null, employeeId: null };
  }

  let internship = internshipById;

  // Projects Tracker currently links associate user IDs. Resolve the latest active
  // internship for that user as a compatibility fallback.
  if (!internship) {
    const { data: internshipByUserId, error: userLookupError } = await adminClient
      .from('internships')
      .select('*, employees!inner(user_id)')
      .eq('employees.user_id', internshipId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userLookupError || !internshipByUserId) {
      return { allowed: false, internship: null, employeeId: null };
    }

    internship = internshipByUserId;
  }

  if (isInternshipAdmin(role)) {
    return {
      allowed: true,
      internship,
      employeeId:
        typeof internship.employee_id === 'string' && internship.employee_id.length > 0
          ? internship.employee_id
          : null,
    };
  }

  const supervisorId =
    typeof internship.supervisor_id === 'string' ? internship.supervisor_id : null;
  if (supervisorId === userId) {
    return {
      allowed: true,
      internship,
      employeeId:
        typeof internship.employee_id === 'string' && internship.employee_id.length > 0
          ? internship.employee_id
          : null,
    };
  }

  const { data: employee } = await resolveEmployeeByUserId(adminClient, userId);
  const employeeId = employee?.id ?? null;

  return {
    allowed: employeeId !== null && internship.employee_id === employeeId,
    internship,
    employeeId,
  };
}

export function toInternshipStatusBadge(
  status: string
): 'active' | 'completed' | 'terminated' | 'on_hold' {
  if (status === 'active' || status === 'completed' || status === 'terminated') {
    return status;
  }

  return 'completed';
}
