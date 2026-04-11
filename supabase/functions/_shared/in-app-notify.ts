import type { SupabaseClient } from '@supabase/supabase-js';

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
    }
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
    }
  } catch (err) {
    console.error(
      '[in-app-notify] Bulk unexpected error:',
      err instanceof Error ? err.message : String(err)
    );
  }
}
