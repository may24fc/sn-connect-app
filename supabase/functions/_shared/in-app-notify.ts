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
}

export async function createInAppNotification(
  supabase: SupabaseClient,
  params: InAppNotificationParams
): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message ?? null,
      link: params.link ?? null,
      metadata: params.metadata ?? {},
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
  const notifications = userIds.map((userId) => ({
    user_id: userId,
    type: params.type,
    title: params.title,
    message: params.message ?? null,
    link: params.link ?? null,
    metadata: params.metadata ?? {},
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
