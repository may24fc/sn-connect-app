import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.ts';
import { sendEmail } from './resend.ts';
import { sendTelegramMessage } from './telegram.ts';

/**
 * In-app notification utility.
 *
 * Inserts directly into the `notifications` table using a service-role client
 * (bypasses RLS). Uses notification_type enum values from the V2-3.1 schema.
 *
 * Silent failure: logs errors but does not throw — in-app notification failure
 * must never block the primary action.
 */

type NotificationType =
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

interface InAppNotificationParams {
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
const DEFAULT_CANONICAL_APP_URL = 'https://app.sngroup.com.au';
const NOTIFICATION_PREFERENCES_ROLE_TYPE = 'notification_preferences';
const HR_OPERATIONS_FROM = 'HR Operations <no-reply@sngroup.com.au>';

interface NotificationPreferences {
  telegram: boolean;
  gmail: boolean;
  telegramChatId: string | null;
}

interface NotificationUserRow {
  id: string;
}

interface NotificationEmployeeRow {
  id: string;
  user_id: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  company_email: string | null;
  personal_email: string | null;
}

interface NotificationOnboardingRow {
  user_id: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  company_email: string | null;
  personal_email: string | null;
}

interface NotificationPreferenceRow {
  user_id: string;
  metadata: Record<string, unknown> | null;
}

interface NotificationRecipient {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  preferences: NotificationPreferences;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  telegram: false,
  gmail: false,
  telegramChatId: null,
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const candidate = value as Record<string, unknown>;
  return {
    telegram:
      typeof candidate.telegram === 'boolean'
        ? candidate.telegram
        : DEFAULT_NOTIFICATION_PREFERENCES.telegram,
    gmail:
      typeof candidate.gmail === 'boolean'
        ? candidate.gmail
        : DEFAULT_NOTIFICATION_PREFERENCES.gmail,
    telegramChatId: normalizeString(candidate.telegramChatId),
  };
}

function getPreferredEmail(
  employee: NotificationEmployeeRow | undefined,
  onboarding: NotificationOnboardingRow | undefined
): string | null {
  return (
    normalizeString(employee?.company_email) ??
    normalizeString(employee?.personal_email) ??
    normalizeString(onboarding?.company_email) ??
    normalizeString(onboarding?.personal_email) ??
    null
  );
}

function getPreferredFirstName(
  employee: NotificationEmployeeRow | undefined,
  onboarding: NotificationOnboardingRow | undefined
): string | null {
  return normalizeString(employee?.first_name) ?? normalizeString(onboarding?.first_name) ?? null;
}

function getPreferredLastName(
  employee: NotificationEmployeeRow | undefined,
  onboarding: NotificationOnboardingRow | undefined
): string | null {
  return normalizeString(employee?.last_name) ?? normalizeString(onboarding?.last_name) ?? null;
}

function getCanonicalAppUrl(): string {
  return (env.APP_URL ?? Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? DEFAULT_CANONICAL_APP_URL).replace(
    /\/$/,
    ''
  );
}

function buildNotificationActionUrl(link: string | undefined): string | undefined {
  if (!link) {
    return undefined;
  }

  if (/^https?:\/\//i.test(link)) {
    return link;
  }

  return `${getCanonicalAppUrl()}${link.startsWith('/') ? link : `/${link}`}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildNotificationEmailHtml(params: {
  heading: string;
  paragraphs: string[];
  actionLabel?: string;
  actionUrl?: string;
}): string {
  const paragraphHtml = params.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">${escapeHtml(
          paragraph
        )}</p>`
    )
    .join('');

  const actionHtml =
    params.actionLabel && params.actionUrl
      ? `<div style="margin:24px 0 0;"><a href="${escapeHtml(
          params.actionUrl
        )}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:600;">${escapeHtml(
          params.actionLabel
        )}</a></div>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f4f4f5;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#0F172A;padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Control Hub HR Portal</h1>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="margin:0 0 16px;color:#18181b;font-size:18px;font-weight:600;">${escapeHtml(
        params.heading
      )}</h2>
      ${paragraphHtml}
      ${actionHtml}
      <div style="border-top:1px solid #e4e4e7;padding-top:20px;margin-top:20px;">
        <p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">
          This is an automated message. Please do not reply to this email.<br />
          &copy; ${new Date().getFullYear()} SN International Group. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function getNotificationRecipients(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<NotificationRecipient[]> {
  if (userIds.length === 0) {
    return [];
  }

  const uniqueUserIds = Array.from(new Set(userIds));
  const [usersResult, employeesResult, onboardingResult, preferencesResult] = await Promise.all([
    supabase.from('users').select('id').in('id', uniqueUserIds).is('deleted_at', null),
    supabase
      .from('employees')
      .select('id, user_id, first_name, middle_name, last_name, company_email, personal_email')
      .in('user_id', uniqueUserIds)
      .is('deleted_at', null),
    supabase
      .from('onboarding_profiles')
      .select('user_id, first_name, middle_name, last_name, company_email, personal_email')
      .in('user_id', uniqueUserIds)
      .is('deleted_at', null),
    supabase
      .from('user_role_metadata')
      .select('user_id, metadata')
      .in('user_id', uniqueUserIds)
      .eq('role_type', NOTIFICATION_PREFERENCES_ROLE_TYPE),
  ]);

  if (usersResult.error) {
    console.error('[in-app-notify] Failed to load users for notification delivery:', usersResult.error.message);
    return [];
  }

  if (employeesResult.error) {
    console.error(
      '[in-app-notify] Failed to load employees for notification delivery:',
      employeesResult.error.message
    );
    return [];
  }

  if (onboardingResult.error) {
    console.error(
      '[in-app-notify] Failed to load onboarding profiles for notification delivery:',
      onboardingResult.error.message
    );
    return [];
  }

  if (preferencesResult.error) {
    console.error(
      '[in-app-notify] Failed to load notification preferences for delivery:',
      preferencesResult.error.message
    );
    return [];
  }

  const userById = new Map(
    ((usersResult.data ?? []) as NotificationUserRow[]).map((user) => [user.id, user])
  );
  const employeeByUserId = new Map(
    ((employeesResult.data ?? []) as NotificationEmployeeRow[])
      .filter((employee) => employee.user_id)
      .map((employee) => [employee.user_id as string, employee])
  );
  const onboardingByUserId = new Map(
    ((onboardingResult.data ?? []) as NotificationOnboardingRow[])
      .filter((profile) => profile.user_id)
      .map((profile) => [profile.user_id as string, profile])
  );
  const preferencesByUserId = new Map(
    ((preferencesResult.data ?? []) as NotificationPreferenceRow[]).map((row) => [
      row.user_id,
      normalizeNotificationPreferences(row.metadata),
    ])
  );

  return uniqueUserIds
    .filter((userId) => userById.has(userId))
    .map((userId) => {
      const employee = employeeByUserId.get(userId);
      const onboarding = onboardingByUserId.get(userId);

      return {
        userId,
        email: getPreferredEmail(employee, onboarding),
        firstName: getPreferredFirstName(employee, onboarding),
        lastName: getPreferredLastName(employee, onboarding),
        preferences: preferencesByUserId.get(userId) ?? DEFAULT_NOTIFICATION_PREFERENCES,
      };
    });
}

async function sendNotificationEmails(
  supabase: SupabaseClient,
  userIds: string[],
  params: Omit<InAppNotificationParams, 'userId'>
): Promise<void> {
  if (params.sendEmail === false || userIds.length === 0) {
    return;
  }

  try {
    const recipients = await getNotificationRecipients(supabase, userIds);
    const actionUrl = buildNotificationActionUrl(params.link);
    const html = buildNotificationEmailHtml({
      heading: params.title,
      paragraphs: [
        params.message ?? 'You have a new notification in Control Hub.',
        actionUrl
          ? 'Open Control Hub to view the full update and take any required action.'
          : 'Open Control Hub to view the latest update.',
      ],
      actionLabel: actionUrl ? 'Open Control Hub' : undefined,
      actionUrl,
    });

    const emailJobs = recipients
      .filter((recipient) => recipient.email && recipient.preferences.gmail)
      .map((recipient) =>
        sendEmail({
          to: recipient.email as string,
          from: HR_OPERATIONS_FROM,
          subject: `Control Hub: ${params.title}`,
          html,
        })
      );

    if (emailJobs.length > 0) {
      await Promise.allSettled(emailJobs);
    }
  } catch (err) {
    console.error(
      '[in-app-notify] Unexpected error sending notification emails:',
      err instanceof Error ? err.message : String(err)
    );
  }
}

async function sendTelegramNotifications(
  supabase: SupabaseClient,
  userIds: string[],
  params: Omit<InAppNotificationParams, 'userId'>
): Promise<void> {
  if (params.sendTelegram === false || userIds.length === 0) {
    return;
  }

  try {
    const recipients = await getNotificationRecipients(supabase, userIds);
    const actionUrl = buildNotificationActionUrl(params.link);
    const text = [
      params.title,
      params.message ?? 'You have a new notification in Control Hub.',
      actionUrl ? `Open Control Hub: ${actionUrl}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    const telegramJobs = recipients
      .filter((recipient) => recipient.preferences.telegram && recipient.preferences.telegramChatId)
      .map((recipient) =>
        sendTelegramMessage({
          chatId: recipient.preferences.telegramChatId as string,
          text,
        })
      );

    if (telegramJobs.length > 0) {
      await Promise.allSettled(telegramJobs);
    }
  } catch (err) {
    console.error(
      '[in-app-notify] Unexpected error sending Telegram notifications:',
      err instanceof Error ? err.message : String(err)
    );
  }
}

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

async function hasRecentNotification(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  dedupeKey: string,
  dedupeWindowHours: number
): Promise<boolean> {
  const cutoff = new Date(Date.now() - dedupeWindowHours * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', cutoff)
    .contains('metadata', { _dedupeKey: dedupeKey });

  if (error) {
    console.error('[in-app-notify] Duplicate check failed:', error.message);
    return false;
  }

  return (count ?? 0) > 0;
}

export async function createInAppNotification(
  supabase: SupabaseClient,
  params: InAppNotificationParams
): Promise<void> {
  try {
    if (params.dedupeKey) {
      const hasDuplicate = await hasRecentNotification(
        supabase,
        params.userId,
        params.type,
        params.dedupeKey,
        params.dedupeWindowHours ?? DEFAULT_DEDUPE_WINDOW_HOURS
      );

      if (hasDuplicate) {
        return;
      }
    }

    const { error } = await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message ?? null,
      link: params.link ?? null,
      metadata: buildNotificationMetadata(params.metadata, params.dedupeKey),
      is_read: false,
    });

    if (error) {
      console.error('[in-app-notify] Failed to create notification:', error.message);
      return;
    }

    await Promise.all([
      sendNotificationEmails(supabase, [params.userId], params),
      sendTelegramNotifications(supabase, [params.userId], params),
    ]);
  } catch (err) {
    console.error(
      '[in-app-notify] Unexpected error:',
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Create in-app notifications for multiple users at once.
 * Uses Promise.allSettled to avoid partial failure blocking.
 */
export async function createBulkInAppNotifications(
  supabase: SupabaseClient,
  userIds: string[],
  params: Omit<InAppNotificationParams, 'userId'>
): Promise<void> {
  let filteredUserIds = userIds;

  if (params.dedupeKey && userIds.length > 0) {
    const cutoff = new Date(
      Date.now() - (params.dedupeWindowHours ?? DEFAULT_DEDUPE_WINDOW_HOURS) * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from('notifications')
      .select('user_id')
      .in('user_id', userIds)
      .eq('type', params.type)
      .gte('created_at', cutoff)
      .contains('metadata', { _dedupeKey: params.dedupeKey });

    if (error) {
      console.error('[in-app-notify] Bulk duplicate check failed:', error.message);
    } else {
      const existingUserIds = new Set((data ?? []).map((row) => row.user_id as string));
      filteredUserIds = userIds.filter((userId) => !existingUserIds.has(userId));
    }
  }

  if (filteredUserIds.length === 0) {
    return;
  }

  const notifications = filteredUserIds.map((userId) => ({
    user_id: userId,
    type: params.type,
    title: params.title,
    message: params.message ?? null,
    link: params.link ?? null,
    metadata: buildNotificationMetadata(params.metadata, params.dedupeKey),
    is_read: false,
  }));

  try {
    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) {
      console.error('[in-app-notify] Bulk insert failed:', error.message);
      return;
    }

    await Promise.all([
      sendNotificationEmails(supabase, filteredUserIds, params),
      sendTelegramNotifications(supabase, filteredUserIds, params),
    ]);
  } catch (err) {
    console.error(
      '[in-app-notify] Bulk unexpected error:',
      err instanceof Error ? err.message : String(err)
    );
  }
}
