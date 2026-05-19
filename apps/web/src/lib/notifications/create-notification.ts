/**
 * Server-side notification creation helper.
 *
 * Uses the Supabase admin client (service role) to bypass RLS
 * and insert notifications for any user. Imported by API routes
 * that need to trigger notifications on mutations.
 */

import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/auth/redirect-config';
import {
  buildAddToCalendarUrl,
  buildCompanyCalendarPageLink,
  formatCompanyCalendarNotificationLabel,
  type CompanyCalendarEvent,
} from '@/lib/company-calendar';
import { sendPortalNotificationEmail } from '@/lib/email';
import { getGmailNotificationEnabledUserIds } from '@/lib/settings/notification-preferences.server';
import { getTelegramNotificationTargets } from '@/lib/settings/notification-preferences.server';
import { sendTelegramMessage } from '@/lib/telegram';
import { getNotificationUserIdentity, getNotificationUserIdentities } from '@/lib/notifications/user-identity';

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
  | 'project_claimable'
  | 'project_assigned'
  | 'system';

export interface CreateNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
  dedupeWindowHours?: number;
  sendEmail?: boolean;
  sendTelegram?: boolean;
}

const DEFAULT_DEDUPE_WINDOW_HOURS = 24;

function buildNotificationMetadata(
  metadata: Record<string, unknown> | undefined,
  dedupeKey: string | undefined
): Record<string, unknown> {
  if (!dedupeKey) {
    return metadata ?? {};
  }

  return {
    ...(metadata ?? {}),
    _dedupeKey: dedupeKey,
  };
}

function buildNotificationActionUrl(link: string | undefined): string | undefined {
  if (!link) {
    return undefined;
  }

  if (/^https?:\/\//i.test(link)) {
    return link;
  }

  return `${getSiteUrl()}${link.startsWith('/') ? link : `/${link}`}`;
}

async function sendNotificationEmails(
  userIds: string[],
  notification: Omit<CreateNotificationPayload, 'userId'>
): Promise<void> {
  if (notification.sendEmail === false || userIds.length === 0) {
    return;
  }

  try {
    const [identities, gmailEnabledUserIds] = await Promise.all([
      getNotificationUserIdentities(userIds),
      getGmailNotificationEnabledUserIds(userIds),
    ]);

    const actionUrl = buildNotificationActionUrl(notification.link);
    const emailJobs = identities
      .filter((identity) => identity.email && gmailEnabledUserIds.has(identity.userId))
      .map((identity) =>
        sendPortalNotificationEmail({
          to: identity.email as string,
          subject: `SN Connect: ${notification.title}`,
          heading: notification.title,
          paragraphs: [
            notification.message ?? 'You have a new notification in SN Connect.',
            actionUrl
              ? 'Open SN Connect to view the full update and take any required action.'
              : 'Open SN Connect to view the latest update.',
          ],
          actionLabel: actionUrl ? 'Open SN Connect' : undefined,
          actionUrl,
        })
      );

    if (emailJobs.length > 0) {
      await Promise.allSettled(emailJobs);
    }
  } catch (err) {
    console.error('[notifications] Unexpected error sending notification emails:', err);
  }
}

async function sendTelegramNotifications(
  userIds: string[],
  notification: Omit<CreateNotificationPayload, 'userId'>
): Promise<void> {
  if (notification.sendTelegram === false || userIds.length === 0) {
    return;
  }

  try {
    const telegramTargets = await getTelegramNotificationTargets(userIds);
    const actionUrl = buildNotificationActionUrl(notification.link);

    if (telegramTargets.length === 0) {
      return;
    }

    const text = [
      notification.title,
      notification.message ?? 'You have a new notification in SN Connect.',
      actionUrl ? `Open SN Connect: ${actionUrl}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    await Promise.allSettled(
      telegramTargets.map((target) =>
        sendTelegramMessage({
          chatId: target.chatId,
          text,
        })
      )
    );
  } catch (err) {
    console.error('[notifications] Unexpected error sending Telegram notifications:', err);
  }
}

// ---- Helpers ---------------------------------------------------------------

/**
 * Insert a single notification for one user. Fire-and-forget — errors are
 * logged but never thrown so they don't break the primary API operation.
 */
export async function createNotification(payload: CreateNotificationPayload): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    if (payload.dedupeKey) {
      const cutoff = new Date(
        Date.now() - (payload.dedupeWindowHours ?? DEFAULT_DEDUPE_WINDOW_HOURS) * 60 * 60 * 1000
      ).toISOString();
      const { count, error: duplicateError } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', payload.userId)
        .eq('type', payload.type)
        .gte('created_at', cutoff)
        .contains('metadata', { _dedupeKey: payload.dedupeKey });

      if (duplicateError) {
        console.error('[notifications] Failed duplicate check:', duplicateError);
      } else if ((count ?? 0) > 0) {
        return;
      }
    }

    const { error } = await admin.from('notifications').insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message ?? null,
      link: payload.link ?? null,
      metadata: buildNotificationMetadata(payload.metadata, payload.dedupeKey),
    });

    if (error) {
      console.error('[notifications] Failed to create notification:', error);
      return;
    }

    await Promise.all([
      sendNotificationEmails([payload.userId], payload),
      sendTelegramNotifications([payload.userId], payload),
    ]);
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
    let filteredUserIds = userIds;

    if (notification.dedupeKey) {
      const cutoff = new Date(
        Date.now() - (notification.dedupeWindowHours ?? DEFAULT_DEDUPE_WINDOW_HOURS) * 60 * 60 * 1000
      ).toISOString();
      const { data, error: duplicateError } = await admin
        .from('notifications')
        .select('user_id')
        .in('user_id', userIds)
        .eq('type', notification.type)
        .gte('created_at', cutoff)
        .contains('metadata', { _dedupeKey: notification.dedupeKey });

      if (duplicateError) {
        console.error('[notifications] Failed bulk duplicate check:', duplicateError);
      } else {
        const existingUserIds = new Set((data ?? []).map((row) => row.user_id as string));
        filteredUserIds = userIds.filter((userId) => !existingUserIds.has(userId));
      }
    }

    if (filteredUserIds.length === 0) {
      return;
    }

    const rows = filteredUserIds.map((userId) => ({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      message: notification.message ?? null,
      link: notification.link ?? null,
      metadata: buildNotificationMetadata(notification.metadata, notification.dedupeKey),
    }));

    const { error } = await admin.from('notifications').insert(rows);

    if (error) {
      console.error('[notifications] Failed to create bulk notifications:', error);
      return;
    }

    await Promise.all([
      sendNotificationEmails(filteredUserIds, notification),
      sendTelegramNotifications(filteredUserIds, notification),
    ]);
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
    const identity = await getNotificationUserIdentity(userId);
    return identity?.displayName ?? 'Team member';
  } catch {
    return 'Team member';
  }
}

export { getNotificationUserIdentity, getNotificationUserIdentities };

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

const COMPANY_CALENDAR_LINKS: Record<(typeof ROLE_GROUPS)[number]['key'], string> = {
  employee: '/calendar',
  admin: '/admin/calendar',
  super_admin: '/super-admin/calendar',
};

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

export async function createCompanyCalendarNotifications(
  events: Array<CompanyCalendarEvent>,
): Promise<void> {
  if (events.length === 0) return;

  for (const group of ROLE_GROUPS) {
    const userIds = await getUserIdsByRoles([...group.roles]);
    if (userIds.length === 0) continue;

    const notifications = events.map((event) => ({
      type: 'system' as const,
      title: `New company event: ${event.summary}`,
      message: [
        formatCompanyCalendarNotificationLabel(event),
        event.location ? `at ${event.location}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      link: buildCompanyCalendarPageLink(COMPANY_CALENDAR_LINKS[group.key], event),
      metadata: {
        calendarEventId: event.id,
        calendarEventStart: event.start,
        calendarEventEnd: event.end,
        calendarEventAllDay: event.allDay,
        calendarEventLocation: event.location,
        calendarAddUrl: buildAddToCalendarUrl(event),
        calendarSourceUrl: event.htmlLink ?? null,
      },
    }));

    const admin = createSupabaseAdminClient();
    const rows = userIds.flatMap((userId) =>
      notifications.map((notification) => ({
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        metadata: notification.metadata,
      })),
    );

    const { error } = await admin.from('notifications').insert(rows);
    if (error) {
      console.error('[notifications] Failed to create calendar notifications:', error);
    }
  }
}
