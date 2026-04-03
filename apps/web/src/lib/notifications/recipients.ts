import { createSupabaseAdminClient } from '@/lib/supabase/server';

export interface NotificationRecipientContact {
  userId: string;
  role: string | null;
  employeeId: string | null;
  name: string;
  email: string | null;
}

const ADMIN_NOTIFICATION_ROLES = ['admin', 'super_admin', 'hr', 'cos', 'ceo'] as const;

export function getProfilePathForRole(role: string | null): string {
  return role === 'intern' ? '/intern/profile' : '/profile';
}

export function getAdminNotificationsPathForRole(role: string | null): string {
  return role === 'super_admin' ? '/super-admin/notifications' : '/admin/notifications';
}

export function getPerformancePathForRole(role: string | null): string {
  return role === 'admin' || role === 'super_admin' || role === 'hr' || role === 'cos' || role === 'ceo'
    ? '/admin/performance'
    : '/performance';
}

export async function getUserContactsByIds(
  userIds: string[]
): Promise<Array<NotificationRecipientContact>> {
  if (userIds.length === 0) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const uniqueIds = Array.from(new Set(userIds));
  const [{ data: users, error: usersError }, { data: employees, error: employeesError }] =
    await Promise.all([
      admin.from('users').select('id, role').in('id', uniqueIds).is('deleted_at', null),
      admin
        .from('employees')
        .select('id, user_id, first_name, last_name, company_email')
        .in('user_id', uniqueIds)
        .is('deleted_at', null),
    ]);

  if (usersError) {
    console.error('[notifications] Failed to load user contacts:', usersError);
    return [];
  }

  if (employeesError) {
    console.error('[notifications] Failed to load employee contacts:', employeesError);
    return [];
  }

  const employeeByUserId = new Map(
    (employees ?? []).map((employee) => [employee.user_id, employee])
  );

  return (users ?? []).map((user) => {
    const employee = employeeByUserId.get(user.id);
    const fullName = employee
      ? `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim()
      : '';

    return {
      userId: user.id,
      role: user.role ?? null,
      employeeId: employee?.id ?? null,
      name: fullName || 'Team member',
      email: employee?.company_email ?? null,
    };
  });
}

export async function getUserContactByUserId(
  userId: string
): Promise<NotificationRecipientContact | null> {
  const [contact] = await getUserContactsByIds([userId]);
  return contact ?? null;
}

export async function getEmployeeContactByEmployeeId(
  employeeId: string
): Promise<NotificationRecipientContact | null> {
  const admin = createSupabaseAdminClient();
  const { data: employee, error: employeeError } = await admin
    .from('employees')
    .select('id, user_id, first_name, last_name, company_email')
    .eq('id', employeeId)
    .is('deleted_at', null)
    .maybeSingle();

  if (employeeError) {
    console.error('[notifications] Failed to load employee contact:', employeeError);
    return null;
  }

  if (!employee?.user_id) {
    return null;
  }

  const { data: user, error: userError } = await admin
    .from('users')
    .select('id, role')
    .eq('id', employee.user_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (userError) {
    console.error('[notifications] Failed to load employee user role:', userError);
    return null;
  }

  return {
    userId: employee.user_id,
    role: user?.role ?? null,
    employeeId: employee.id,
    name: `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim() || 'Team member',
    email: employee.company_email ?? null,
  };
}

export async function getAdminNotificationContacts(
  excludeUserId?: string
): Promise<Array<NotificationRecipientContact>> {
  const admin = createSupabaseAdminClient();
  const { data: users, error } = await admin
    .from('users')
    .select('id')
    .in('role', [...ADMIN_NOTIFICATION_ROLES])
    .is('deleted_at', null);

  if (error) {
    console.error('[notifications] Failed to load admin recipients:', error);
    return [];
  }

  const userIds = (users ?? []).map((user) => user.id).filter((userId) => userId !== excludeUserId);
  return getUserContactsByIds(userIds);
}