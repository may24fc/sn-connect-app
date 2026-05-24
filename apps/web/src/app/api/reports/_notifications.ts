import {
  createNotificationsForUsers,
  getUserDisplayName,
  getUserIdsByRoles,
} from '@/lib/notifications/create-notification';

interface NotifySubmittedReportOptions {
  reportId: string;
  reportType: string | null | undefined;
  submittedBy: string;
}

interface NotifyMarketingSubmissionWebhookOptions {
  employeeId: string | null | undefined;
  submittedAt: string | null | undefined;
  reportDisplayName?: string | null | undefined;
  isWeeklyPlan?: boolean;
}

export async function notifySuperAdminsAboutSubmittedReport({
  reportId,
  reportType,
  submittedBy,
}: NotifySubmittedReportOptions): Promise<void> {
  const [submitterName, adminIds] = await Promise.all([
    getUserDisplayName(submittedBy),
    getUserIdsByRoles(['super_admin', 'admin']),
  ]);

  const recipients = adminIds.filter((userId) => userId !== submittedBy);
  if (recipients.length === 0) {
    return;
  }

  await createNotificationsForUsers(recipients, {
    type: 'report_submitted',
    title: 'Report Submitted for Review',
    message: `${submitterName} submitted a ${reportType?.replace(/_/g, ' ') ?? 'report'} for review`,
    link: '/admin/reports',
    metadata: { reportId, submittedBy },
    dedupeKey: `report-submitted:${reportId}`,
  });
}

export async function notifyMarketingSubmissionWebhook({
  employeeId,
  submittedAt,
  reportDisplayName,
  isWeeklyPlan,
}: NotifyMarketingSubmissionWebhookOptions): Promise<void> {
  if (!employeeId) {
    return;
  }

  const webhookUrl = process.env.N8N_MARKETING_REPORT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[n8n] Skipped marketing report webhook: N8N_MARKETING_REPORT_WEBHOOK_URL is not configured.');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employeeId,
        submitted_at: submittedAt ?? new Date().toISOString(),
        report_display_name: reportDisplayName?.trim() || null,
        is_weekly_plan: Boolean(isWeeklyPlan),
      }),
    });

    if (!response.ok) {
      console.error(
        `[n8n] Marketing report webhook returned ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error('[n8n] Failed to fire marketing report webhook:', error);
  }
}