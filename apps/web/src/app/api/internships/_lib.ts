import { createSupabaseServerClient } from '@/lib/supabase/server';

export const INTERNSHIP_ADMIN_ROLES = ['admin', 'hr', 'cos', 'ceo', 'super_admin'];

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
        user,
        role: null,
        error: 'Failed to resolve user role' as const,
      };
    }

    role = roleData?.role ?? null;
  }

  return { supabase, user, role, error: null };
}

export async function resolveEmployeeByUserId(supabase: any, userId: string) {
  return supabase
    .from('employees')
    .select('id, user_id, first_name, last_name, company_email, department, position, immediate_head')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
}

export async function canAccessInternship(
  supabase: any,
  internshipId: string,
  userId: string,
  role: string | null
): Promise<{ allowed: boolean; internship: Record<string, unknown> | null; employeeId: string | null }> {
  const { data: internship, error: internshipError } = await supabase
    .from('internships')
    .select('*')
    .eq('id', internshipId)
    .single();

  if (internshipError || !internship) {
    return { allowed: false, internship: null, employeeId: null };
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

  const supervisorId = typeof internship.supervisor_id === 'string' ? internship.supervisor_id : null;
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

  const { data: employee } = await resolveEmployeeByUserId(supabase, userId);
  const employeeId = employee?.id ?? null;

  return {
    allowed: employeeId !== null && internship.employee_id === employeeId,
    internship,
    employeeId,
  };
}

export function toInternshipStatusBadge(status: string): 'active' | 'completed' | 'terminated' | 'on_hold' {
  if (status === 'active' || status === 'completed' || status === 'terminated') {
    return status;
  }

  return 'completed';
}
