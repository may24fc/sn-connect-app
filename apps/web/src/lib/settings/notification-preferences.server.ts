import { randomBytes } from 'node:crypto';

import { createSupabaseAdminClient } from '@/lib/supabase/server';
import {
  NOTIFICATION_PREFERENCES_ROLE_TYPE,
  type StoredNotificationPreferences,
  normalizeStoredNotificationPreferences,
} from '@/lib/settings/notification-preferences';

export interface TelegramNotificationTarget {
  userId: string;
  chatId: string;
  username: string | null;
}

function getTelegramBotUsername(): string | null {
  const value = process.env.TELEGRAM_BOT_USERNAME?.trim();
  return value || null;
}

export function buildTelegramStartUrl(token: string): string | null {
  const botUsername = getTelegramBotUsername();

  if (!botUsername) {
    return null;
  }

  return `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`;
}

export function createTelegramLinkToken(): string {
  return randomBytes(24).toString('hex');
}

export async function getStoredNotificationPreferencesForUser(
  userId: string
): Promise<StoredNotificationPreferences> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('user_role_metadata')
    .select('metadata')
    .eq('user_id', userId)
    .eq('role_type', NOTIFICATION_PREFERENCES_ROLE_TYPE)
    .maybeSingle();

  if (error) {
    console.error('[notifications] Failed to load stored notification preferences:', error);
    return normalizeStoredNotificationPreferences(null);
  }

  return normalizeStoredNotificationPreferences(data?.metadata);
}

export async function getTelegramNotificationTargets(
  userIds: string[]
): Promise<TelegramNotificationTarget[]> {
  if (userIds.length === 0) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('user_role_metadata')
    .select('user_id, metadata')
    .in('user_id', Array.from(new Set(userIds)))
    .eq('role_type', NOTIFICATION_PREFERENCES_ROLE_TYPE);

  if (error) {
    console.error('[notifications] Failed to load Telegram notification targets:', error);
    return [];
  }

  return (data ?? [])
    .map((row) => ({
      userId: row.user_id as string,
      preferences: normalizeStoredNotificationPreferences(row.metadata),
    }))
    .filter(({ preferences }) => preferences.telegram && Boolean(preferences.telegramChatId))
    .map(({ userId, preferences }) => ({
      userId,
      chatId: preferences.telegramChatId as string,
      username: preferences.telegramUsername,
    }));
}

export async function getGmailNotificationEnabledUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) {
    return new Set();
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('user_role_metadata')
    .select('user_id, metadata')
    .in('user_id', Array.from(new Set(userIds)))
    .eq('role_type', NOTIFICATION_PREFERENCES_ROLE_TYPE);

  if (error) {
    console.error('[notifications] Failed to load Gmail notification preferences:', error);
    return new Set();
  }

  return new Set(
    (data ?? [])
      .filter((row) => normalizeStoredNotificationPreferences(row.metadata).gmail)
      .map((row) => row.user_id as string)
  );
}

export async function isGmailNotificationEnabledForUser(userId: string | null | undefined): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const enabledUserIds = await getGmailNotificationEnabledUserIds([userId]);
  return enabledUserIds.has(userId);
}

export async function isTelegramNotificationEnabledForUser(
  userId: string | null | undefined
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const targets = await getTelegramNotificationTargets([userId]);
  return targets.some((target) => target.userId === userId);
}