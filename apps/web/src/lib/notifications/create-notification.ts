/**
 * Server-side notification creation helper.
 *
 * Uses the Supabase admin client (service role) to bypass RLS
 * and insert notifications for any user. Imported by API routes
 * that need to trigger notifications on mutations.
 */

import { createSupabaseAdminClient } from '@/lib/supabase/server';

// ---- Types ----------------------------------------------------------------

export type NotificationType =
  | 'task_assigned'
  | 'task_due'
  | 'report_submitted'
  | 'report_approved'
  | 'report_rejected'
  | 'invoice_submitted'
  | 'invoice_approved'
  | 'invoice_rejected'
  | 'intern_log_submitted'
  | 'intern_log_approved'
  | 'onboarding_approved'
  | 'onboarding_rejected'
  | 'announcement_new'
  | 'resource_new'
  | 'reminder'
  | 'onboarding_step'
  | 'probation_update'
  | 'system';

export interface CreateNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

// ---- Helpers ---------------------------------------------------------------

/**
 * Insert a single notification for one user. Fire-and-forget — errors are
 * logged but never thrown so they don't break the primary API operation.
 */
export async function createNotification(payload: CreateNotificationPayload): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from('notifications').insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message ?? null,
      link: payload.link ?? null,
      metadata: payload.metadata ?? {},
    });

    if (error) {
      console.error('[notifications] Failed to create notification:', error);
    }
  } catch (err) {
    console.error('[notifications] Unexpected error creating notification:', err);
  }
}

/**
 * Insert notifications for multiple users at once (same content, different
 * recipients). Uses a single bulk insert for efficiency.
 */
export async function createNotificationsForUsers(
  userIds: string[],
  notification: Omit<CreateNotificationPayload, 'userId'>
): Promise<void> {
  if (userIds.length === 0) return;

  try {
    const admin = createSupabaseAdminClient();
    const rows = userIds.map((userId) => ({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      message: notification.message ?? null,
      link: notification.link ?? null,
      metadata: notification.metadata ?? {},
    }));

    const { error } = await admin.from('notifications').insert(rows);

    if (error) {
      console.error('[notifications] Failed to create bulk notifications:', error);
    }
  } catch (err) {
    console.error('[notifications] Unexpected error creating bulk notifications:', err);
  }
}

/**
 * Fetch user IDs for all admin / super_admin users.
 * Useful for notifying admins about employee actions (report submitted, etc.)
 */
export async function getAdminUserIds(): Promise<string[]> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('users')
      .select('id')
      .in('role', ['admin', 'super_admin'])
      .is('deleted_at', null);

    if (error) {
      console.error('[notifications] Failed to fetch admin user IDs:', error);
      return [];
    }

    return (data ?? []).map((u) => u.id);
  } catch (err) {
    console.error('[notifications] Unexpected error fetching admin IDs:', err);
    return [];
  }
}

/**
 * Get the display name for a user from the employees table.
 */
export async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from('employees')
      .select('first_name, last_name')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (data) {
      return `${data.first_name} ${data.last_name}`.trim();
    }
    return 'A user';
  } catch {
    return 'A user';
  }
}

/**
 * Get all active user IDs (for broad notifications like announcements).
 * Optionally filter by roles.
 */
export async function getUserIdsByRoles(roles?: string[]): Promise<string[]> {
  try {
    const admin = createSupabaseAdminClient();
    let query = admin.from('users').select('id').is('deleted_at', null);

    if (roles && roles.length > 0) {
      query = query.in('role', roles);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[notifications] Failed to fetch users by roles:', error);
      return [];
    }

    return (data ?? []).map((u) => u.id);
  } catch (err) {
    console.error('[notifications] Unexpected error fetching users:', err);
    return [];
  }
}

// ---- Role-scoped link mapping ------------------------------------------------

const ANNOUNCEMENT_LINKS: Record<string, string> = {
  employee: '/announcements',
  intern: '/announcements',
  admin: '/admin/announcements',
  super_admin: '/super-admin/announcements',
};

const ROLE_GROUPS = [
  { roles: ['employee', 'intern'], key: 'employee' },
  { roles: ['admin'], key: 'admin' },
  { roles: ['super_admin'], key: 'super_admin' },
] as const;

/**
 * Send announcement notifications with role-appropriate links.
 * Splits recipients by role group so each user gets a link to their
 * own announcement page rather than a 404.
 */
export async function createAnnouncementNotifications(
  excludeUserId: string,
  notification: { title: string; message: string; metadata?: Record<string, unknown> },
  targetRoles?: string[] | null,
): Promise<void> {
  for (const group of ROLE_GROUPS) {
    const scopedRoles = targetRoles && targetRoles.length > 0
      ? group.roles.filter((r) => targetRoles.includes(r))
      : [...group.roles];

    if (scopedRoles.length === 0) continue;

    const userIds = await getUserIdsByRoles(scopedRoles);
    const recipients = userIds.filter((uid) => uid !== excludeUserId);
    if (recipients.length === 0) continue;

    createNotificationsForUsers(recipients, {
      type: 'announcement_new',
      title: notification.title,
      message: notification.message,
      link: ANNOUNCEMENT_LINKS[group.key] ?? '/announcements',
      metadata: notification.metadata ?? {},
    });
  }
}
