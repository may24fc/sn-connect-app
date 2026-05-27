import { getNotificationUserIdentity } from '@/lib/notifications/user-identity';
import { getStoredNotificationPreferencesForUser } from '@/lib/settings/notification-preferences.server';

interface FivePercentReflectionWebhookPayload {
  id: string;
  user_id: string;
  employee_id: string | null;
  month_key: string;
  full_name: string;
  department_role: string;
  work_feelings: string;
  work_headline: string;
  work_significance: string;
  work_rank: number;
  work_action: string;
  family_feelings: string;
  family_headline: string;
  family_significance: string;
  family_rank: number;
  family_action: string;
  personal_feelings: string;
  personal_headline: string;
  personal_significance: string;
  personal_rank: number;
  personal_action: string;
  deep_dive_parking_lot: string;
  exploration_topics: string;
  submitted_at: string;
}

interface NotifyFivePercentReflectionWebhookOptions {
  submission: FivePercentReflectionWebhookPayload;
}

export async function notifyFivePercentReflectionWebhook({
  submission,
}: NotifyFivePercentReflectionWebhookOptions): Promise<void> {
  const webhookUrl = process.env.N8N_FIVE_PERCENT_REFLECTION_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.warn(
      '[n8n] Skipped five percent reflection webhook: N8N_FIVE_PERCENT_REFLECTION_WEBHOOK_URL is not configured.'
    );
    return;
  }

  try {
    const [identity, preferences] = await Promise.all([
      getNotificationUserIdentity(submission.user_id),
      getStoredNotificationPreferencesForUser(submission.user_id),
    ]);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'five_percent_reflection.submitted',
        submitted_at: submission.submitted_at,
        reflection: {
          id: submission.id,
          month_key: submission.month_key,
          full_name: submission.full_name,
          department_role: submission.department_role,
          work: {
            feelings: submission.work_feelings,
            headline: submission.work_headline,
            significance: submission.work_significance,
            rank: submission.work_rank,
            action: submission.work_action,
          },
          family: {
            feelings: submission.family_feelings,
            headline: submission.family_headline,
            significance: submission.family_significance,
            rank: submission.family_rank,
            action: submission.family_action,
          },
          personal: {
            feelings: submission.personal_feelings,
            headline: submission.personal_headline,
            significance: submission.personal_significance,
            rank: submission.personal_rank,
            action: submission.personal_action,
          },
          deep_dive_parking_lot: submission.deep_dive_parking_lot,
          exploration_topics: submission.exploration_topics,
        },
        recipient: {
          user_id: submission.user_id,
          employee_id: submission.employee_id,
          display_name: identity?.displayName ?? submission.full_name,
          first_name: identity?.firstName ?? null,
          last_name: identity?.lastName ?? null,
          email: identity?.email ?? null,
          channels: {
            gmail: preferences.gmail,
            telegram: preferences.telegram,
          },
          telegram: {
            chat_id: preferences.telegramChatId,
            username: preferences.telegramUsername,
          },
        },
      }),
    });

    if (!response.ok) {
      console.error(
        `[n8n] Five percent reflection webhook returned ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error('[n8n] Failed to fire five percent reflection webhook:', error);
  }
}
