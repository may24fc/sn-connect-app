import { createSupabaseAdminClient } from '@/lib/supabase/server';

type NotificationType =
  | 'task_assigned'
  | 'task_due'
  | 'report_submitted'
  | 'report_approved'
  | 'report_rejected'
  | 'announcement_new'
  | 'resource_new'
  | 'reminder'
  | 'onboarding_step'
  | 'probation_update'
  | 'system';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
}

interface CreateBulkNotificationParams {
  userIds: Array<string>;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
}

/**
 * Server-side helper to insert a notification.
 * Uses the admin client to bypass RLS — only call from server code (API routes, Edge Functions).
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<{ id: string } | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message ?? null,
      link: params.link ?? null,
      metadata: params.metadata ?? {},
      expires_at: params.expiresAt ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create notification:', error);
    return null;
  }

  return { id: data.id };
}

/**
 * Server-side helper to insert notifications for multiple users.
 * Uses the admin client to bypass RLS — only call from server code.
 */
export async function createBulkNotifications(
  params: CreateBulkNotificationParams
): Promise<number> {
  const supabase = createSupabaseAdminClient();

  const records = params.userIds.map((userId) => ({
    user_id: userId,
    type: params.type,
    title: params.title,
    message: params.message ?? null,
    link: params.link ?? null,
    metadata: params.metadata ?? {},
    expires_at: params.expiresAt ?? null,
  }));

  const { data, error } = await supabase.from('notifications').insert(records).select('id');

  if (error) {
    console.error('Failed to create bulk notifications:', error);
    return 0;
  }

  return data?.length ?? 0;
}
