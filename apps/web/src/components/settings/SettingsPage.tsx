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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Switch,
  useToast,
} from '@hr-portal/ui';
import { BellRing, Copy, ExternalLink, Link2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

interface NotificationPreferenceOption {
  channel: NotificationChannel;
  title: string;
  description: string;
  hint: string;
}

interface TelegramWebLinkIntent {
  webUrl: string;
  startCommand: string | null;
}

interface TelegramLinkDialogState {
  open: boolean;
  webUrl: string | null;
  startCommand: string | null;
}

const notificationPreferences: NotificationPreferenceOption[] = [
  {
    channel: 'telegram',
    title: 'Telegram notifications',
    description: 'Receive direct messages in Telegram for task updates, approvals, and reminders.',
    hint: 'Disabled by default. Turn this on only after your Telegram account is linked in Telegram Web.',
  },
  {
    channel: 'gmail',
    title: 'Gmail notifications',
    description: 'Receive email summaries and important account activity in your Gmail inbox.',
    hint: 'Best for longer updates you may want to archive or forward.',
  },
];

function TelegramLogo(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" fill="#229ED9" />
      <path
        fill="#FFFFFF"
        d="M17.37 7.78 15.7 16.02c-.12.58-.46.72-.94.45l-2.6-1.92-1.25 1.2c-.14.14-.25.25-.52.25l.18-2.66 4.85-4.38c.21-.19-.05-.3-.32-.12l-6 3.78-2.59-.81c-.57-.18-.58-.57.12-.84l10.11-3.9c.47-.17.88.11.73.81Z"
      />
    </svg>
  );
}

function GmailLogo(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="#EA4335" d="M2 6.75 12 14.25 22 6.75V6a2 2 0 0 0-2-2h-.46L12 9.78 4.46 4H4a2 2 0 0 0-2 2v.75Z" />
      <path fill="#FFFFFF" d="M22 6.75 15.82 11.4 22 16.12V6.75Z" />
      <path fill="#FFFFFF" d="M15.82 11.4 12 14.25 8.18 11.4 2 16.12V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1.88l-6.18-4.72Z" />
      <path fill="#FFFFFF" d="M2 6.75V16.12L8.18 11.4 2 6.75Z" />
    </svg>
  );
}

function createTelegramWebLinkIntent(connectUrl: string): TelegramWebLinkIntent | null {
  try {
    const parsedUrl = new URL(connectUrl);
    const botUsername = parsedUrl.pathname.replace(/^\/+/, '').trim();
    const startToken = parsedUrl.searchParams.get('start')?.trim() || null;

    if (!botUsername) {
      return null;
    }

    return {
      webUrl: `https://web.telegram.org/k/#@${botUsername}`,
      startCommand: startToken ? `/start ${startToken}` : null,
    };
  } catch {
    return null;
  }
}

async function copyTextToClipboard(value: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function SettingsPage(): ReactNode {
  const { user } = useAuth();
  const { addToast } = useToast();
  const preferencesQuery = useNotificationPreferences(user?.id);
  const updatePreferences = useUpdateNotificationPreferences(user?.id);
  const createTelegramLink = useCreateTelegramLink(user?.id);
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [savedPreferences, setSavedPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [telegramLinkDialog, setTelegramLinkDialog] = useState<TelegramLinkDialogState>({
    open: false,
    webUrl: null,
    startCommand: null,
  });

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

      const telegramWebIntent = createTelegramWebLinkIntent(result.connectUrl);
      setTelegramLinkDialog({
        open: true,
        webUrl: telegramWebIntent?.webUrl ?? result.connectUrl,
        startCommand: telegramWebIntent?.startCommand ?? null,
      });

      addToast({
        title: isTelegramLinked ? 'Telegram relink started' : 'Telegram link ready',
        description: 'Follow the steps in the dialog to finish linking your Telegram account.',
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

  const handleCopyTelegramStartCommand = async (): Promise<void> => {
    if (!telegramLinkDialog.startCommand) {
      return;
    }

    const copied = await copyTextToClipboard(telegramLinkDialog.startCommand);
    addToast({
      title: copied ? 'Telegram command copied' : 'Copy failed',
      description: copied
        ? 'Paste the one-time /start command into the Telegram bot chat.'
        : 'Copy the command manually from the dialog and paste it into Telegram.',
      variant: copied ? 'success' : 'error',
    });
  };

  const handleOpenTelegramWeb = (): void => {
    if (!telegramLinkDialog.webUrl) {
      return;
    }

    window.open(telegramLinkDialog.webUrl, '_blank', 'noopener,noreferrer');
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
            Manage how Control Hub sends account notifications to you.
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
              const Icon = preference.channel === 'telegram' ? TelegramLogo : GmailLogo;

              return (
                <div
                  key={preference.channel}
                  className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/30 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                      <Icon />
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
                                ? 'Telegram Web is waiting for your one-time /start command. This page will refresh automatically after the bot confirms the link.'
                                : 'This opens a step-by-step modal with the Telegram Web link and one-time /start command.'}
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
                      Gmail notifications use your Control Hub account email immediately. Telegram direct messages require a one-time bot link per user and remain off until each user enables them.
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

      <Dialog
        open={telegramLinkDialog.open}
        onOpenChange={(open) => setTelegramLinkDialog((current) => ({ ...current, open }))}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Link Telegram notifications</DialogTitle>
            <DialogDescription>
              Use Telegram Web to open your Control Hub bot, then send the one-time command below to finish linking this account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Steps</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                <li>Copy the one-time <code className="rounded bg-zinc-200/70 px-1.5 py-0.5 text-[13px] dark:bg-zinc-800">/start</code> command below.</li>
                <li>Open Telegram Web for the Control Hub bot.</li>
                <li>Paste the command into the chat and send it once.</li>
                <li>Return here and wait for the badge to switch to linked.</li>
              </ol>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                One-time Telegram command
              </p>
              <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="break-all font-mono text-sm text-zinc-900 dark:text-zinc-100">
                  {telegramLinkDialog.startCommand ?? 'Unable to generate the one-time /start command.'}
                </p>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                This command is temporary and should only be sent to your Control Hub bot.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleOpenTelegramWeb} disabled={!telegramLinkDialog.webUrl}>
              <ExternalLink className="h-4 w-4" />
              Open Telegram Web
            </Button>
            <Button type="button" onClick={() => void handleCopyTelegramStartCommand()} disabled={!telegramLinkDialog.startCommand}>
              <Copy className="h-4 w-4" />
              Copy /start command
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}