/**
 * Shared (client + server) rules for associate EOD / daily log attachments.
 */

export const DAILY_LOG_ATTACHMENT_BUCKET = 'associate-daily-log-attachments';
export const DAILY_LOG_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;
export const DAILY_LOG_LINK_ATTACHMENT_MIME_TYPE = 'text/uri-list';

/** Must stay in sync with the bucket's `allowed_mime_types`. */
export const DAILY_LOG_ATTACHMENT_MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
};

export const DAILY_LOG_ALLOWED_ATTACHMENT_MIME_TYPES: ReadonlySet<string> = new Set(
  Object.values(DAILY_LOG_ATTACHMENT_MIME_BY_EXTENSION)
);

/**
 * Resolves the MIME type we will store a file under. Browsers sometimes report
 * an empty `file.type` (notably .doc/.docx on Windows without Office), so fall
 * back to the extension. Returns null when the file is not an allowed type.
 */
export function resolveDailyLogAttachmentMimeType(
  fileName: string,
  reportedType: string
): string | null {
  if (DAILY_LOG_ALLOWED_ATTACHMENT_MIME_TYPES.has(reportedType)) {
    return reportedType;
  }

  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return DAILY_LOG_ATTACHMENT_MIME_BY_EXTENSION[extension] ?? null;
}

export function sanitizeDailyLogAttachmentName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}
