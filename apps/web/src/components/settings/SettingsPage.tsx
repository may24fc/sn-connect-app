'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  useCreateTelegramLink,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotificationPreferences';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationChannel,
} from '@/lib/settings/notification-preferences';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Switch,
  useToast,
} from '@hr-portal/ui';
import { BellRing, Link2, Loader2, Mail, MessageCircleMore, RefreshCw, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

interface NotificationPreferenceOption {
  channel: NotificationChannel;
  title: string;
  description: string;
  hint: string;
}

const notificationPreferences: NotificationPreferenceOption[] = [
  {
    channel: 'telegram',
    title: 'Telegram notifications',
    description: 'Receive direct messages in Telegram for task updates, approvals, and reminders.',
    hint: 'Disabled by default. Turn this on only after your Telegram account is linked.',
  },
  {
    channel: 'gmail',
    title: 'Gmail notifications',
    description: 'Receive email summaries and important account activity in your Gmail inbox.',
    hint: 'Best for longer updates you may want to archive or forward.',
  },
];

export default function SettingsPage(): ReactNode {
  const { user } = useAuth();
  const { addToast } = useToast();
  const preferencesQuery = useNotificationPreferences(user?.id);
  const updatePreferences = useUpdateNotificationPreferences(user?.id);
  const createTelegramLink = useCreateTelegramLink(user?.id);
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [savedPreferences, setSavedPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);

  useEffect(() => {
    if (!preferencesQuery.data) {
      return;
    }

    setPreferences(preferencesQuery.data);
    setSavedPreferences(preferencesQuery.data);
  }, [preferencesQuery.data]);

  const hasChanges =
    preferences.telegram !== savedPreferences.telegram || preferences.gmail !== savedPreferences.gmail;
  const isInitialLoading = preferencesQuery.isLoading && !preferencesQuery.data;
  const isTelegramLinked = preferences.telegramLinkState === 'linked';
  const isTelegramPending = preferences.telegramLinkState === 'pending';

  const handleToggle = (channel: NotificationChannel, checked: boolean): void => {
    setPreferences((current) => ({
      ...current,
      [channel]: checked,
    }));
  };

  const handleSave = async (): Promise<void> => {
    try {
      const nextPreferences = await updatePreferences.mutateAsync(preferences);
      setPreferences(nextPreferences);
      setSavedPreferences(nextPreferences);
      addToast({ title: 'Notification settings saved', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Failed to save notification settings',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  };

  const handleConnectTelegram = async (): Promise<void> => {
    try {
      const result = await createTelegramLink.mutateAsync();
      setSavedPreferences(result.preferences);
      setPreferences(result.preferences);
      window.open(result.connectUrl, '_blank', 'noopener,noreferrer');
      addToast({
        title: isTelegramLinked ? 'Telegram relink started' : 'Telegram link ready',
        description: 'Complete the /start step in Telegram to finish linking your account.',
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Failed to create Telegram link',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  };

  const telegramStatusLabel = isTelegramLinked
    ? preferences.telegramUsername
      ? `Linked as @${preferences.telegramUsername}`
      : 'Linked'
    : isTelegramPending
      ? 'Awaiting /start confirmation'
      : 'Not linked';

  return (
    <div className="h-full space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Settings
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage how SN Connect sends account notifications to you.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            disabled={!user?.id || isInitialLoading || updatePreferences.isPending || !hasChanges}
            onClick={() => void handleSave()}
          >
            {updatePreferences.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Choose which channels can receive personal app notifications once integrations are connected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notificationPreferences.map((preference) => {
              const checked = preferences[preference.channel];
              const Icon = preference.channel === 'telegram' ? MessageCircleMore : Mail;

              return (
                <div
                  key={preference.channel}
                  className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/30 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                          {preference.title}
                        </h3>
                        <Badge variant={checked ? 'default' : 'secondary'} className="text-[11px]">
                          {checked ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {preference.channel === 'telegram' ? (
                          <Badge
                            variant={isTelegramLinked ? 'default' : 'secondary'}
                            className="text-[11px]"
                          >
                            {telegramStatusLabel}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        {preference.description}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">{preference.hint}</p>
                      {preference.channel === 'telegram' ? (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              !user?.id ||
                              isInitialLoading ||
                              createTelegramLink.isPending ||
                              updatePreferences.isPending ||
                              hasChanges
                            }
                            onClick={() => void handleConnectTelegram()}
                          >
                            {createTelegramLink.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Preparing link...
                              </>
                            ) : isTelegramLinked ? (
                              <>
                                <RefreshCw className="h-4 w-4" />
                                Reconnect Telegram
                              </>
                            ) : (
                              <>
                                <Link2 className="h-4 w-4" />
                                Connect Telegram
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-zinc-500 dark:text-zinc-500">
                            {hasChanges
                              ? 'Save your notification changes before starting the Telegram link flow.'
                              : isTelegramPending
                                ? 'A fresh link is ready. Finish the /start step in Telegram, then this page will refresh automatically.'
                                : 'This opens your SN Connect bot with a one-time /start link.'}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:pl-4">
                    <span className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                      Allow
                    </span>
                    <Switch
                      checked={checked}
                      onCheckedChange={(nextChecked) => handleToggle(preference.channel, nextChecked)}
                      aria-label={`Toggle ${preference.title}`}
                      disabled={isInitialLoading || updatePreferences.isPending}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  <BellRing className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">Delivery coverage</CardTitle>
                  <CardDescription>
                    Snapshot of the channels currently allowed for your account.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {notificationPreferences.map((preference) => {
                const checked = preferences[preference.channel];

                return (
                  <div
                    key={`${preference.channel}-summary`}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/30"
                  >
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {preference.channel === 'telegram' ? telegramStatusLabel : preference.title}
                    </span>
                    <Badge variant={checked ? 'default' : 'secondary'} className="text-[11px]">
                      {checked ? 'On' : 'Off'}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Integration status</CardTitle>
              <CardDescription>
                Gmail delivery is active now. Telegram delivery starts after you complete the bot linking flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.8} />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Channel readiness</p>
                    <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      Gmail notifications use your SN Connect account email immediately. Telegram direct messages require a one-time bot link per user and remain off until each user enables them.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-500">
                {preferencesQuery.isError
                  ? 'Saved preferences could not be loaded. You can retry by changing a value and saving again.'
                  : hasChanges
                    ? 'You have unsaved notification preference changes.'
                    : isTelegramPending
                      ? 'Telegram is waiting for your /start confirmation. This page refreshes automatically while the link is pending.'
                    : 'Your notification preferences are saved to your account profile.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}