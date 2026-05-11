import type { DailyLogAttachment, ProjectFocusEntry } from '@hr-portal/ui';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeProjectEntries(
  value: unknown,
  fallbackTasksCompleted?: string | null
): Array<ProjectFocusEntry> {
  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => {
        if (!isRecord(entry)) {
          return null;
        }

        const projectFocus = toNonEmptyString(entry.projectFocus);
        const challenge = toNonEmptyString(entry.challenge);
        const actionTaken = toNonEmptyString(entry.actionTaken);
        const outcome = toNonEmptyString(entry.outcome);

        if (!(projectFocus && actionTaken && outcome)) {
          return null;
        }

        return {
          id: toNonEmptyString(entry.id) ?? crypto.randomUUID(),
          projectFocus,
          ...(challenge ? { challenge } : {}),
          actionTaken,
          outcome,
        } satisfies ProjectFocusEntry;
      })
      .filter((entry): entry is ProjectFocusEntry => entry !== null);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  const fallback = toNonEmptyString(fallbackTasksCompleted);
  if (!fallback) {
    return [];
  }

  return [
    {
      id: crypto.randomUUID(),
      projectFocus: 'General Update',
      actionTaken: fallback,
      outcome: 'Completed for the day',
    },
  ];
}

export function normalizeStringList(
  value: unknown,
  fallbackText?: string | null
): Array<string> {
  if (Array.isArray(value)) {
    return value
      .map((item) => toNonEmptyString(item))
      .filter((item): item is string => item !== null);
  }

  const fallback = toNonEmptyString(fallbackText);
  if (!fallback) {
    return [];
  }

  return fallback
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeAttachmentRecords(value: unknown): Array<DailyLogAttachment> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map<DailyLogAttachment | null>((attachment) => {
      if (!isRecord(attachment)) {
        return null;
      }

      const fileName = toNonEmptyString(attachment.fileName);
      const filePath = toNonEmptyString(attachment.filePath);
      const mimeType = toNonEmptyString(attachment.mimeType);
      const sizeValue = attachment.fileSize;
      const fileSize =
        typeof sizeValue === 'number'
          ? sizeValue
          : typeof sizeValue === 'string'
            ? Number.parseInt(sizeValue, 10)
            : NaN;

      if (!(fileName && filePath && mimeType) || !Number.isFinite(fileSize) || fileSize < 0) {
        return null;
      }

      const signedUrl =
        typeof attachment.signedUrl === 'string' && attachment.signedUrl.length > 0
          ? attachment.signedUrl
          : null;

      return {
        id: toNonEmptyString(attachment.id) ?? crypto.randomUUID(),
        fileName,
        filePath,
        fileSize,
        mimeType,
        ...(signedUrl !== null ? { signedUrl } : {}),
      } satisfies DailyLogAttachment;
    })
    .filter((attachment): attachment is DailyLogAttachment => attachment !== null);
}

export function buildTasksCompletedSummary(entries: Array<ProjectFocusEntry>): string {
  return entries
    .map(
      (entry) =>
        `${entry.projectFocus}: ${entry.actionTaken}${entry.outcome ? ` -> ${entry.outcome}` : ''}`
    )
    .join('\n');
}

export function buildListSummary(entries: Array<string>): string | null {
  const normalized = entries.map((entry) => entry.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.join('\n') : null;
}