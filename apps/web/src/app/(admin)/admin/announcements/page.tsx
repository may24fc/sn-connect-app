'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useArchiveAnnouncement, useToggleAnnouncementPin } from '@/hooks/usePublishAnnouncement';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate } from '@/lib/format';
import {
  AnnouncementCard,
  AnnouncementFilters,
  type AnnouncementFiltersValue,
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import { Archive, MoreHorizontal, Pin, PinOff, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

/** Maps status to badge variant */
function getStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' {
  switch (status) {
    case 'published':
      return 'success';
    case 'draft':
      return 'secondary';
    case 'scheduled':
      return 'warning';
    case 'archived':
      return 'outline';
    case 'expired':
      return 'destructive';
    default:
      return 'default';
  }
}

/** Maps priority to badge variant */
function getPriorityBadgeVariant(
  priority: string
): 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'warning';
    case 'normal':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'default';
  }
}

/** Formats label for display */
function formatLabel(value: string): string {
  if (value === 'hr_updates') return 'HR Updates';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function AdminAnnouncementsPage() {
  const [filters, setFilters] = useState<AnnouncementFiltersValue>({
    search: '',
    status: 'all',
    category: 'all',
    priority: 'all',
    view: 'card',
  });

  const queryFilters = {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status !== 'all'
      ? { status: filters.status as 'draft' | 'scheduled' | 'published' | 'expired' | 'archived' }
      : {}),
    ...(filters.category !== 'all'
      ? {
          category: filters.category as
            | 'hr_updates'
            | 'benefits'
            | 'events'
            | 'performance'
            | 'training'
            | 'policy'
            | 'general',
        }
      : {}),
    ...(filters.priority !== 'all'
      ? { priority: filters.priority as 'low' | 'normal' | 'high' | 'urgent' }
      : {}),
    page: 1,
    pageSize: 100,
  };

  const { data, isLoading, error } = useAnnouncements(queryFilters);
  const archiveAnnouncement = useArchiveAnnouncement();
  const togglePin = useToggleAnnouncementPin();
  const { addToast } = useToast();

  const announcements = data?.data || [];

  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  const statusOrder: Record<string, number> = { draft: 0, scheduled: 1, published: 2, archived: 3, expired: 4 };

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({ initialColumn: 'date', initialDirection: 'desc' });

  const sortedAnnouncements = sortItems(announcements, {
    title: (a) => a.title.toLowerCase(),
    category: (a) => a.category,
    status: (a) => statusOrder[a.status] ?? 99,
    priority: (a) => priorityOrder[a.priority] ?? 99,
    date: (a) => a.published_at || a.created_at || '',
    reads: (a) => a.read_count,
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  const stats = useMemo(() => {
    const total = announcements.length;
    const drafts = announcements.filter((item) => item.status === 'draft').length;
    const scheduled = announcements.filter((item) => item.status === 'scheduled').length;
    const published = announcements.filter((item) => item.status === 'published').length;
    const readCount = announcements.reduce((acc, item) => acc + item.read_count, 0);
    return { total, drafts, scheduled, published, readCount };
  }, [announcements]);

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden">
      <div className="border-b border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Announcements</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage scheduled and published company announcements
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4 mr-1.5" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Archive className="mr-2 h-4 w-4" />
                  Bulk Archive
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600 dark:text-red-400">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Bulk Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              asChild
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md font-medium"
            >
              <Link href="/admin/announcements/new">Create New</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Drafts', value: stats.drafts },
            { label: 'Scheduled', value: stats.scheduled },
            { label: 'Published', value: stats.published },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="bg-card border border-border rounded-lg p-4"
            >
              <CardContent className="p-0">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{stat.label}</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <AnnouncementFilters value={filters} onChange={setFilters} />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Total reads across listed announcements: {stats.readCount}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <Card className="bg-card border border-border rounded-lg p-4">
            <CardContent className="p-0 text-sm text-zinc-600 dark:text-zinc-400">
              Loading announcements...
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-card border border-border rounded-lg p-4">
            <CardContent className="p-0 text-sm text-rose-600 dark:text-rose-400">
              Failed to load announcements.
            </CardContent>
          </Card>
        ) : filters.view === 'list' ? (
          <Card className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-zinc-200 dark:border-zinc-800">
                  <SortableTableHead column="title" {...sortHeadProps}>
                    Title
                  </SortableTableHead>
                  <SortableTableHead column="category" {...sortHeadProps}>
                    Category
                  </SortableTableHead>
                  <SortableTableHead column="status" {...sortHeadProps}>
                    Status
                  </SortableTableHead>
                  <SortableTableHead column="priority" {...sortHeadProps}>
                    Priority
                  </SortableTableHead>
                  <SortableTableHead column="date" {...sortHeadProps}>
                    Date
                  </SortableTableHead>
                  <SortableTableHead column="reads" {...sortHeadProps}>
                    Reads
                  </SortableTableHead>
                  <TableHead className="text-sm font-medium text-zinc-600 dark:text-zinc-400 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAnnouncements.map((announcement) => (
                  <TableRow
                    key={announcement.id}
                    className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                    onClick={() => {
                      window.location.href = `/admin/announcements/${announcement.id}`;
                    }}
                  >
                    <TableCell className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      <div className="flex items-center gap-2">
                        {announcement.is_pinned && <Pin className="h-3.5 w-3.5 text-slate-700" />}
                        <span className="truncate max-w-[300px]">{announcement.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatLabel(announcement.category)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(announcement.status)}>
                        {formatLabel(announcement.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityBadgeVariant(announcement.priority)}>
                        {formatLabel(announcement.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDate(announcement.published_at || announcement.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {announcement.read_count}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation prevents row click, buttons handle their own events */}
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            togglePin.mutate({
                              id: announcement.id,
                              pinned: !announcement.is_pinned,
                            }, {
                              onSuccess: () => addToast({ title: announcement.is_pinned ? 'Unpinned' : 'Pinned', variant: 'success' }),
                              onError: () => addToast({ title: 'Failed to update pin', variant: 'error' }),
                            })
                          }
                          title={announcement.is_pinned ? 'Unpin' : 'Pin'}
                        >
                          {announcement.is_pinned ? (
                            <PinOff className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                          ) : (
                            <Pin className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => archiveAnnouncement.mutate(announcement.id, {
                            onSuccess: () => addToast({ title: 'Announcement archived', variant: 'success' }),
                            onError: () => addToast({ title: 'Failed to archive', variant: 'error' }),
                          })}
                          title="Archive"
                        >
                          <Archive className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                title={announcement.title}
                excerpt={announcement.excerpt || announcement.content.slice(0, 200)}
                category={formatLabel(announcement.category)}
                priority={announcement.priority}
                status={announcement.status}
                dateLabel={formatDate(announcement.published_at || announcement.created_at)}
                isPinned={announcement.is_pinned}
                readCount={announcement.read_count}
                onClick={() => {
                  window.location.href = `/admin/announcements/${announcement.id}`;
                }}
                actions={
                  // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation prevents card click
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        togglePin.mutate({
                          id: announcement.id,
                          pinned: !announcement.is_pinned,
                        }, {
                          onSuccess: () => addToast({ title: announcement.is_pinned ? 'Unpinned' : 'Pinned', variant: 'success' }),
                          onError: () => addToast({ title: 'Failed to update pin', variant: 'error' }),
                        })
                      }
                    >
                      {announcement.is_pinned ? (
                        <><PinOff className="mr-1 h-3.5 w-3.5" /> Unpin</>
                      ) : (
                        <><Pin className="mr-1 h-3.5 w-3.5" /> Pin</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => archiveAnnouncement.mutate(announcement.id, {
                        onSuccess: () => addToast({ title: 'Announcement archived', variant: 'success' }),
                        onError: () => addToast({ title: 'Failed to archive', variant: 'error' }),
                      })}
                    >
                      <Archive className="mr-1 h-3.5 w-3.5" /> Archive
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
