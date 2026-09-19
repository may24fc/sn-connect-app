'use client';

import { BulkRecordActionDialog } from '@/components/admin/BulkRecordActionDialog';
import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { ServerPagination } from '@/components/data-display/ServerPagination';
import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useArchiveAnnouncement, useToggleAnnouncementPin } from '@/hooks/usePublishAnnouncement';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import {
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
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import { AlertCircle, Archive, FileText, Loader2, MoreHorizontal, Pin, PinOff, Plus, Trash2 } from 'lucide-react';
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

const PAGE_SIZE = 25;

export default function AdminAnnouncementsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AnnouncementFiltersValue>({
    search: '',
    status: 'all',
    category: 'all',
    priority: 'all',
    view: 'list',
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
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, isFetching, error } = useAnnouncements(queryFilters);
  const archiveAnnouncement = useArchiveAnnouncement();
  const togglePin = useToggleAnnouncementPin();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const invalidateAnnouncements = (): void => {
    queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
  };

  const announcements = data?.data || [];
  const pagination = data?.pagination;

  // Reset to the first page whenever the filter set changes, otherwise a page
  // number from a wider result set can land the user on an empty page.
  const handleFiltersChange = (next: AnnouncementFiltersValue): void => {
    setPage(1);
    setFilters(next);
  };

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

  // Whole-dataset counts come from the API; the current page cannot produce them.
  const stats = useMemo(
    () => ({
      total: data?.stats?.total ?? 0,
      drafts: data?.stats?.draft ?? 0,
      scheduled: data?.stats?.scheduled ?? 0,
      published: data?.stats?.published ?? 0,
    }),
    [data?.stats]
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="p-3">
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
                <DropdownMenuItem asChild>
                  <Link href="/admin/announcements/archive">
                    <Archive className="mr-2 h-4 w-4" />
                    View Archive
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setBulkArchiveOpen(true);
                  }}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Bulk Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400"
                  onSelect={(event) => {
                    event.preventDefault();
                    setBulkDeleteOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Bulk Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              asChild
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md font-medium"
            >
              <Link href="/admin/announcements/new"><Plus className="mr-2 h-4 w-4" />Create New</Link>
            </Button>
          </div>
        </div>

        <StatCardGrid columns={4} className="mb-6">
          <StatCard label="Total" value={stats.total} icon={<FileText className="h-4 w-4" strokeWidth={1.5} />} />
          <StatCard label="Drafts" value={stats.drafts} icon={<FileText className="h-4 w-4" strokeWidth={1.5} />} />
          <StatCard label="Scheduled" value={stats.scheduled} icon={<FileText className="h-4 w-4" strokeWidth={1.5} />} />
          <StatCard label="Published" value={stats.published} icon={<FileText className="h-4 w-4" strokeWidth={1.5} />} />
        </StatCardGrid>

        <AnnouncementFilters value={filters} onChange={handleFiltersChange} showViewToggle={false} />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <Card className="bg-card border border-border rounded-lg p-4">
            <CardContent className="p-0">
              <EmptyState
                icon={<Loader2 className="h-5 w-5 animate-spin" />}
                title="Loading announcements"
                description="Fetching the latest announcement records and filters."
                size="sm"
              />
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-card border border-border rounded-lg p-4">
            <CardContent className="p-0">
              <EmptyState
                icon={AlertCircle}
                title="Failed to load announcements"
                description="The announcements list could not be retrieved. Refresh and try again."
                size="sm"
              />
            </CardContent>
          </Card>
        ) : (
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
                    onDoubleClick={() => {
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
        )}

        <ServerPagination
          pagination={pagination}
          onPageChange={setPage}
          isLoading={isFetching}
          itemLabel="announcements"
          className="mt-4"
        />
      </div>

      <BulkRecordActionDialog
        open={bulkArchiveOpen}
        onOpenChange={setBulkArchiveOpen}
        title="Bulk Archive Announcements"
        description="Archived announcements leave the active list and can be restored from the archive page. Only announcements loaded in the current list are shown."
        emptyTitle="Nothing to archive"
        emptyDescription="Every announcement in the current list is already archived."
        actionLabel="Archive"
        actionIcon={<Archive className="mr-1.5 h-4 w-4" />}
        items={announcements
          .filter((announcement) => announcement.status !== 'archived')
          .map((announcement) => ({
            id: announcement.id,
            label: announcement.title,
            hint: announcement.status,
          }))}
        perform={async (item) => {
          const response = await fetch(`/api/announcements/${item.id}/archive`, {
            method: 'POST',
          });
          if (!response.ok) {
            const error = await response
              .json()
              .catch(() => ({ error: 'Failed to archive announcement' }));
            throw new Error(error.error || 'Failed to archive announcement');
          }
        }}
        onCompleted={invalidateAnnouncements}
      />

      <BulkRecordActionDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Bulk Delete Announcements"
        description="Deleting removes announcements from every list. This is a soft delete, so records stay recoverable in the database, but employees lose access immediately."
        emptyTitle="Nothing to delete"
        emptyDescription="There are no announcements in the current list."
        actionLabel="Delete"
        actionIcon={<Trash2 className="mr-1.5 h-4 w-4" />}
        destructive
        items={announcements.map((announcement) => ({
          id: announcement.id,
          label: announcement.title,
          hint: announcement.status,
        }))}
        perform={async (item) => {
          const response = await fetch(`/api/announcements/${item.id}`, { method: 'DELETE' });
          if (!response.ok) {
            const error = await response
              .json()
              .catch(() => ({ error: 'Failed to delete announcement' }));
            throw new Error(error.error || 'Failed to delete announcement');
          }
        }}
        onCompleted={invalidateAnnouncements}
      />
    </div>
  );
}
