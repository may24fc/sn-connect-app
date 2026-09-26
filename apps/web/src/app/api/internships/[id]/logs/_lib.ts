import {
  DAILY_LOG_ATTACHMENT_BUCKET,
  DAILY_LOG_LINK_ATTACHMENT_MIME_TYPE,
} from '@/lib/daily-log-attachments';
import type { createSupabaseAdminClient } from '@/lib/supabase/server';
import type { DailyLogAttachment } from '@hr-portal/ui';

const DAILY_LOG_ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 10;

export function isExternalLinkAttachment(attachment: DailyLogAttachment): boolean {
  return (
    attachment.mimeType === DAILY_LOG_LINK_ATTACHMENT_MIME_TYPE ||
    /^https?:\/\//i.test(attachment.filePath)
  );
}

export async function signDailyLogAttachments(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  attachments: Array<DailyLogAttachment>
): Promise<Array<DailyLogAttachment>> {
  return Promise.all(
    attachments.map(async (attachment) => {
      if (isExternalLinkAttachment(attachment)) {
        return {
          ...attachment,
          signedUrl: attachment.filePath,
        };
      }

      const { data, error } = await adminClient.storage
        .from(DAILY_LOG_ATTACHMENT_BUCKET)
        .createSignedUrl(attachment.filePath, DAILY_LOG_ATTACHMENT_SIGNED_URL_TTL_SECONDS);

      return {
        ...attachment,
        signedUrl: error ? null : (data?.signedUrl ?? null),
      };
    })
  );
}
