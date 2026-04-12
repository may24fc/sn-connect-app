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

export async function notifySuperAdminsAboutSubmittedReport({
  reportId,
  reportType,
  submittedBy,
}: NotifySubmittedReportOptions): Promise<void> {
  const [submitterName, superAdminIds] = await Promise.all([
    getUserDisplayName(submittedBy),
    getUserIdsByRoles(['super_admin']),
  ]);

  const recipients = superAdminIds.filter((userId) => userId !== submittedBy);
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