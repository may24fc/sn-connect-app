'use client';

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  extractNotificationPreferencesUpdate,
  normalizeNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/settings/notification-preferences';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface CreateTelegramLinkResponse {
  connectUrl: string;
  expiresAt: string;
  preferences: NotificationPreferences;
}

export const notificationPreferenceKeys = {
  all: ['notification-preferences'] as const,
  user: (userId: string) => [...notificationPreferenceKeys.all, userId] as const,
};

export function useNotificationPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: notificationPreferenceKeys.user(userId ?? ''),
    queryFn: async (): Promise<NotificationPreferences> => {
      const response = await fetch(`/api/users/${userId}/notification-preferences`);

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.details || error?.error || 'Failed to load notification preferences');
      }

      const json = await response.json();
      return normalizeNotificationPreferences(json.data);
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
    placeholderData: DEFAULT_NOTIFICATION_PREFERENCES,
    refetchInterval: (query) =>
      query.state.data?.telegramLinkState === 'pending' ? 5_000 : false,
  });
}

export function useUpdateNotificationPreferences(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: NotificationPreferences): Promise<NotificationPreferences> => {
      const response = await fetch(`/api/users/${userId}/notification-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extractNotificationPreferencesUpdate(payload)),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.details || error?.error || 'Failed to update notification preferences');
      }

      const json = await response.json();
      return normalizeNotificationPreferences(json.data);
    },
    onSuccess: (data) => {
      if (!userId) {
        return;
      }

      queryClient.setQueryData(notificationPreferenceKeys.user(userId), data);
    },
  });
}

export function useCreateTelegramLink(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<CreateTelegramLinkResponse> => {
      const response = await fetch(`/api/users/${userId}/notification-preferences/telegram-link`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.details || error?.error || 'Failed to create Telegram connection link');
      }

      const json = await response.json();
      return {
        connectUrl: json.data.connectUrl,
        expiresAt: json.data.expiresAt,
        preferences: normalizeNotificationPreferences(json.data.preferences),
      };
    },
    onSuccess: (data) => {
      if (!userId) {
        return;
      }

      queryClient.setQueryData(notificationPreferenceKeys.user(userId), data.preferences);
    },
  });
}