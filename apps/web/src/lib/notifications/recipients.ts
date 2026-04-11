import { getNotificationUserIdentities } from '@/lib/notifications/user-identity';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export interface NotificationRecipientContact {
  userId: string;
  role: string | null;
  employeeId: string | null;
  name: string;
  email: string | null;
}

interface EmployeeNotificationIdentityRow {
  id: string;
  user_id?: string | null;
  first_name: string | null;
  middle_name?: string | null;
  last_name: string | null;
  company_email: string | null;
  personal_email?: string | null;
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

function buildEmployeeDisplayName(employee: EmployeeNotificationIdentityRow | null | undefined): string | null {
  if (!employee) {
    return null;
  }

  const fullName = `${employee.first_name ?? ''} ${employee.middle_name ?? ''} ${employee.last_name ?? ''}`
    .trim()
    .replace(/\s+/g, ' ');

  return fullName || employee.company_email || employee.personal_email || null;
}

export async function getUserContactsByIds(
  userIds: string[]
): Promise<Array<NotificationRecipientContact>> {
  const identities = await getNotificationUserIdentities(userIds);

  return identities.map((identity) => ({
    userId: identity.userId,
    role: identity.role,
    employeeId: identity.employeeId,
    name: identity.displayName,
    email: identity.email,
  }));
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
    .select('id, user_id, first_name, middle_name, last_name, company_email, personal_email')
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
    name: buildEmployeeDisplayName(employee) ?? 'Team member',
    email: employee.company_email ?? employee.personal_email ?? null,
  };
}

export async function getEmployeeDisplayNameByEmployeeId(
  employeeId: string
): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data: employee, error } = await admin
    .from('employees')
    .select('id, first_name, middle_name, last_name, company_email, personal_email')
    .eq('id', employeeId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('[notifications] Failed to resolve employee display name:', error);
    return null;
  }

  return buildEmployeeDisplayName(employee);
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