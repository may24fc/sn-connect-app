'use client';

import {
  useDeleteNotification,
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import type { NotificationFilters } from '@/lib/query-keys';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import {
  Bell,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
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
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

// --- Types ---

type NotificationType =
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
  task_assigned: 'text-slate-500',
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

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  task_assigned: 'Task Assigned',
  task_due: 'Task Due',
  report_submitted: 'Report Submitted',
  report_approved: 'Report Approved',
  report_rejected: 'Report Rejected',
  announcement_new: 'Announcement',
  resource_new: 'New Resource',
  reminder: 'Reminder',
  onboarding_step: 'Onboarding',
  probation_update: 'Probation',
  system: 'System',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// --- Page ---

export default function AdminNotificationsPage(): ReactNode {
  const router = useRouter();
  const [filters, setFilters] = useState<NotificationFilters>({
    page: 1,
    pageSize: 20,
    isRead: 'all',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useNotifications(filters);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const deleteNotification = useDeleteNotification();
  const { addToast } = useToast();

  const notifications = data?.data ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 };
  const unreadCount = data?.unreadCount ?? 0;

  const handleNotificationClick = (notification: {
    id: string;
    is_read: boolean;
    link: string | null;
  }): void => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const toggleSelect = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = (): void => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const handleBulkMarkRead = (): void => {
    for (const id of selectedIds) {
      markRead.mutate(id);
    }
    setSelectedIds(new Set());
    addToast({ title: `${selectedIds.size} notification(s) marked as read`, variant: 'success' });
  };

  const handleBulkDelete = (): void => {
    for (const id of selectedIds) {
      deleteNotification.mutate(id);
    }
    setSelectedIds(new Set());
    addToast({ title: `${selectedIds.size} notification(s) deleted`, variant: 'success' });
  };

  return (
    <div className="h-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Notifications
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'You\u2019re all caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate(undefined, {
                onSuccess: () => addToast({ title: 'All notifications marked as read', variant: 'success' }),
                onError: () => addToast({ title: 'Failed to mark all as read', variant: 'error' }),
              })}
              disabled={markAllRead.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filters & Bulk Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={String(filters.isRead)}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              isRead: value === 'true' ? true : value === 'false' ? false : 'all',
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="false">Unread</SelectItem>
            <SelectItem value="true">Read</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.type ?? 'all'}
          onValueChange={(value) => {
            const newType = value === 'all' ? undefined : value;
            setFilters((prev) => {
              const next: NotificationFilters = { ...prev, page: 1 };
              if (newType !== undefined) {
                next.type = newType;
              } else {
                delete next.type;
              }
              return next;
            });
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Types</SelectItem>
            {Object.entries(NOTIFICATION_TYPE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="secondary" className="text-xs">
              {selectedIds.size} selected
            </Badge>
            <Button variant="outline" size="sm" onClick={handleBulkMarkRead}>
              <CheckCircle className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
              Mark Read
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Notification List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-base">
                {pagination.total > 0
                  ? `${pagination.total} notification${pagination.total > 1 ? 's' : ''}`
                  : 'No notifications'}
              </CardTitle>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs text-slate-700 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300 font-medium"
                >
                  {selectedIds.size === notifications.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            {/* Pagination - Gmail style at top */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {(pagination.page - 1) * (filters.pageSize ?? 20) + 1}-
                  {Math.min(pagination.page * (filters.pageSize ?? 20), pagination.total)} of {pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Previous page"
                    disabled={pagination.page <= 1}
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Next page"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications found"
              description={
                filters.isRead !== 'all' || filters.type
                  ? 'Try adjusting your filters to widen the notification list.'
                  : 'Notifications will appear here when you receive them.'
              }
              size="sm"
            />
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {notifications.map((notification) => {
                const IconComponent =
                  NOTIFICATION_ICONS[notification.type as NotificationType] ?? Info;
                const iconColor =
                  NOTIFICATION_COLORS[notification.type as NotificationType] ?? 'text-zinc-500 dark:text-zinc-400';
                const typeLabel =
                  NOTIFICATION_TYPE_LABELS[notification.type as NotificationType] ??
                  notification.type;
                const isSelected = selectedIds.has(notification.id);

                return (
                  <div
                    key={notification.id}
                    className={`group flex items-start gap-3 px-6 py-4 cursor-pointer transition-colors ${
                      notification.is_read
                        ? 'bg-card hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        : 'bg-slate-50/30 dark:bg-zinc-950/10 hover:bg-slate-50/50 dark:hover:bg-zinc-950/20'
                    } ${isSelected ? 'ring-2 ring-inset ring-slate-500/30' : ''}`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(notification.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 rounded border-zinc-300 dark:border-zinc-600 text-slate-700 focus:ring-slate-500"
                    />

                    {/* Icon */}
                    <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>
                      <IconComponent className="h-5 w-5" strokeWidth={1.5} />
                    </div>

                    {/* Content */}
                    <div
                      className="flex-1 min-w-0"
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm ${
                              notification.is_read
                                ? 'text-zinc-700 dark:text-zinc-300'
                                : 'font-semibold text-zinc-900 dark:text-zinc-50'
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-slate-900" />
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {typeLabel}
                        </Badge>
                      </div>
                      {notification.message && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.is_read && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead.mutate(notification.id);
                          }}
                          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          aria-label="Mark as read"
                          title="Mark as read"
                        >
                          <CheckCircle className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                            deleteNotification.mutate(notification.id, {
                              onSuccess: () => addToast({ title: 'Notification deleted', variant: 'success' }),
                              onError: () => addToast({ title: 'Failed to delete notification', variant: 'error' }),
                            });
                        }}
                        className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        aria-label="Delete notification"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
