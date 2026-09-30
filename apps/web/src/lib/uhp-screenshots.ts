import { stageFormDataFiles } from '@/lib/storage/stage-form-data';
import { UHP_ATTACHMENT_MAX_FILE_SIZE, isUhpAttachmentMimeType } from '@/lib/uhp';
import type { ClipboardEvent } from 'react';

export type ExtractedUhpContact = {
  name: string | null;
  phone: string | null;
  email: string | null;
  channel: string | null;
};

export function validateUhpScreenshot(file: File): string | null {
  if (!isUhpAttachmentMimeType(file.type)) return 'Use a PNG, JPG, or WEBP screenshot.';
  if (file.size > UHP_ATTACHMENT_MAX_FILE_SIZE) return 'Screenshot must be 10 MB or smaller.';
  return null;
}

export function imageFromClipboard(event: ClipboardEvent): File | null {
  const item = Array.from(event.clipboardData.items).find((entry) =>
    entry.type.startsWith('image/')
  );
  return item?.getAsFile() ?? null;
}

async function postScreenshot<T>(url: string, file: File, fields: Record<string, string> = {}) {
  const formData = new FormData();
  formData.append('file', file);
  for (const [key, value] of Object.entries(fields)) formData.append(key, value);
  const response = await fetch(url, { method: 'POST', body: await stageFormDataFiles(formData) });
  const payload = (await response.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!(response.ok && payload.data)) throw new Error(payload.error ?? 'Upload failed');
  return payload.data;
}

export function extractUhpContact(file: File): Promise<ExtractedUhpContact> {
  return postScreenshot<ExtractedUhpContact>('/api/uhp/clients/extract-contact', file);
}

export function uploadUhpScreenshot(
  clientId: string,
  file: File,
  activityId?: string
): Promise<{ id: string }> {
  return postScreenshot<{ id: string }>(
    `/api/uhp/clients/${clientId}/attachments`,
    file,
    activityId ? { activityId } : {}
  );
}
