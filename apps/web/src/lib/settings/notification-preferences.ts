export type NotificationChannel = 'telegram' | 'gmail';

export type TelegramLinkState = 'unlinked' | 'pending' | 'linked';

export interface NotificationPreferences {
  telegram: boolean;
  gmail: boolean;
  telegramUsername: string | null;
  telegramLinkedAt: string | null;
  telegramLinkPendingUntil: string | null;
  telegramLinkState: TelegramLinkState;
}

export interface NotificationPreferencesUpdateInput {
  telegram: boolean;
  gmail: boolean;
}

export interface StoredNotificationPreferences extends NotificationPreferencesUpdateInput {
  telegramChatId: string | null;
  telegramUsername: string | null;
  telegramLinkedAt: string | null;
  telegramLinkToken: string | null;
  telegramLinkTokenExpiresAt: string | null;
}

export const NOTIFICATION_PREFERENCES_ROLE_TYPE = 'notification_preferences';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  telegram: false,
  gmail: false,
  telegramUsername: null,
  telegramLinkedAt: null,
  telegramLinkPendingUntil: null,
  telegramLinkState: 'unlinked',
};

export const DEFAULT_STORED_NOTIFICATION_PREFERENCES: StoredNotificationPreferences = {
  telegram: DEFAULT_NOTIFICATION_PREFERENCES.telegram,
  gmail: DEFAULT_NOTIFICATION_PREFERENCES.gmail,
  telegramChatId: null,
  telegramUsername: null,
  telegramLinkedAt: null,
  telegramLinkToken: null,
  telegramLinkTokenExpiresAt: null,
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function normalizeFutureIsoString(value: unknown): string | null {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp) || timestamp <= Date.now()) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function normalizeIsoString(value: unknown): string | null {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function normalizeTelegramLinkState(value: unknown): TelegramLinkState | null {
  if (value === 'unlinked' || value === 'pending' || value === 'linked') {
    return value;
  }

  return null;
}

export function normalizeStoredNotificationPreferences(value: unknown): StoredNotificationPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_STORED_NOTIFICATION_PREFERENCES;
  }

  const candidate = value as Record<string, unknown>;

  return {
    telegram:
      typeof candidate.telegram === 'boolean'
        ? candidate.telegram
        : DEFAULT_STORED_NOTIFICATION_PREFERENCES.telegram,
    gmail:
      typeof candidate.gmail === 'boolean'
        ? candidate.gmail
        : DEFAULT_STORED_NOTIFICATION_PREFERENCES.gmail,
    telegramChatId: normalizeString(candidate.telegramChatId),
    telegramUsername: normalizeString(candidate.telegramUsername),
    telegramLinkedAt: normalizeIsoString(candidate.telegramLinkedAt),
    telegramLinkToken: normalizeString(candidate.telegramLinkToken),
    telegramLinkTokenExpiresAt: normalizeFutureIsoString(candidate.telegramLinkTokenExpiresAt),
  };
}

export function toClientNotificationPreferences(value: unknown): NotificationPreferences {
  const stored = normalizeStoredNotificationPreferences(value);
  const telegramLinkPendingUntil = stored.telegramChatId ? null : stored.telegramLinkTokenExpiresAt;

  return {
    telegram: stored.telegram,
    gmail: stored.gmail,
    telegramUsername: stored.telegramUsername,
    telegramLinkedAt: stored.telegramLinkedAt,
    telegramLinkPendingUntil,
    telegramLinkState: stored.telegramChatId
      ? 'linked'
      : telegramLinkPendingUntil
        ? 'pending'
        : 'unlinked',
  };
}

export function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const candidate = value as Record<string, unknown>;
    const telegramLinkState = normalizeTelegramLinkState(candidate.telegramLinkState);

    if (telegramLinkState) {
      return {
        telegram:
          typeof candidate.telegram === 'boolean'
            ? candidate.telegram
            : DEFAULT_NOTIFICATION_PREFERENCES.telegram,
        gmail:
          typeof candidate.gmail === 'boolean'
            ? candidate.gmail
            : DEFAULT_NOTIFICATION_PREFERENCES.gmail,
        telegramUsername: normalizeString(candidate.telegramUsername),
        telegramLinkedAt: normalizeIsoString(candidate.telegramLinkedAt),
        telegramLinkPendingUntil:
          telegramLinkState === 'pending'
            ? normalizeFutureIsoString(candidate.telegramLinkPendingUntil)
            : null,
        telegramLinkState,
      };
    }
  }

  return toClientNotificationPreferences(value);
}

export function normalizeNotificationPreferencesUpdate(
  value: unknown
): NotificationPreferencesUpdateInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.telegram !== 'boolean' || typeof candidate.gmail !== 'boolean') {
    return null;
  }

  return {
    telegram: candidate.telegram,
    gmail: candidate.gmail,
  };
}

export function extractNotificationPreferencesUpdate(
  value: Pick<NotificationPreferences, 'telegram' | 'gmail'>
): NotificationPreferencesUpdateInput {
  return {
    telegram: value.telegram,
    gmail: value.gmail,
  };
}