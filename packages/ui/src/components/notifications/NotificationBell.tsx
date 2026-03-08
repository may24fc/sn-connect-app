'use client';

import {
  Bell,
  BookOpen,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  Info,
  Loader2,
  Megaphone,
  Target,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type * as React from 'react';
import { Button } from '../../primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../primitives/dropdown-menu';
import { cn } from '../../utils/cn';

// --- Types ---

export type NotificationType =
  | 'task_assigned'
  | 'task_due'
  | 'report_submitted'
  | 'report_approved'
  | 'report_rejected'
  | 'announcement_new'
  | 'resource_new'
  | 'reminder'
  | 'onboarding_step'
  | 'probation_update'
  | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationBellProps {
  notifications: Array<NotificationItem>;
  unreadCount: number;
  isLoading?: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onNavigate: (path: string) => void;
  onViewAll: () => void;
}

// --- Helpers ---

const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  task_assigned: ClipboardList,
  task_due: Target,
  report_submitted: FileText,
  report_approved: CheckCircle,
  report_rejected: XCircle,
  announcement_new: Megaphone,
  resource_new: FolderOpen,
  reminder: Bell,
  onboarding_step: BookOpen,
  probation_update: UserCheck,
  system: Info,
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  task_assigned: 'text-indigo-500',
  task_due: 'text-amber-500',
  report_submitted: 'text-blue-500',
  report_approved: 'text-emerald-500',
  report_rejected: 'text-rose-500',
  announcement_new: 'text-violet-500',
  resource_new: 'text-teal-500',
  reminder: 'text-amber-500',
  onboarding_step: 'text-cyan-500',
  probation_update: 'text-orange-500',
  system: 'text-zinc-500 dark:text-zinc-400',
};

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// --- Component ---

export function NotificationBell({
  notifications,
  unreadCount,
  isLoading = false,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onNavigate,
  onViewAll,
}: NotificationBellProps): React.ReactNode {
  const handleNotificationClick = (notification: NotificationItem): void => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
    if (notification.link) {
      onNavigate(notification.link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="group relative text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell
            className="h-5 w-5 text-zinc-500 dark:text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
            strokeWidth={1.5}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-rose-600 text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-96 max-h-[480px] bg-popover border border-border p-0 overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <DropdownMenuLabel className="p-0 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMarkAllRead();
              }}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              Mark All Read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="overflow-y-auto max-h-[360px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-8 w-8 text-zinc-400 dark:text-zinc-600 mb-2" strokeWidth={1.5} />
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                No notifications
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                You&apos;re all caught up!
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const IconComponent = NOTIFICATION_ICONS[notification.type] ?? Info;
              const iconColor = NOTIFICATION_COLORS[notification.type] ?? 'text-zinc-500 dark:text-zinc-400';

              return (
                <div
                  key={notification.id}
                  className={cn(
                    'group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-b-0',
                    notification.is_read
                      ? 'bg-card hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      : 'bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(notification);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {/* Icon */}
                  <div className={cn('flex-shrink-0 mt-0.5', iconColor)}>
                    <IconComponent className="h-4 w-4" strokeWidth={1.5} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'text-sm truncate',
                          notification.is_read
                            ? 'text-zinc-700 dark:text-zinc-300'
                            : 'font-medium text-zinc-900 dark:text-zinc-50'
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="flex-shrink-0 h-2 w-2 rounded-full bg-indigo-600 mt-1.5" />
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {getTimeAgo(notification.created_at)}
                      </span>
                      {notification.link && (
                        <ExternalLink
                          className="h-3 w-3 text-zinc-400 dark:text-zinc-600"
                          strokeWidth={1.5}
                        />
                      )}
                    </div>
                  </div>

                  {/* Delete button (shown on hover) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(notification.id);
                    }}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    aria-label="Delete notification"
                  >
                    <Trash2
                      className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400"
                      strokeWidth={1.5}
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DropdownMenuSeparator className="m-0 bg-zinc-200 dark:bg-zinc-800" />
        <div className="px-4 py-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onViewAll();
            }}
            className="flex items-center justify-center gap-1 w-full text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors py-1"
          >
            View All Notifications
            <ChevronRight className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
