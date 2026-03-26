'use client';

import { useAnnouncements, type AnnouncementRecord } from '@/hooks/useAnnouncements';
import { useRestoreAnnouncement } from '@/hooks/usePublishAnnouncement';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { formatDate } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@hr-portal/ui';
import { Archive, ArrowLeft, RotateCcw, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    hr_updates: 'HR Updates',
    benefits: 'Benefits',
    events: 'Events',
    performance: 'Performance',
    training: 'Training',
    policy: 'Policy',
    general: 'General',
    emergency: 'Emergency',
  };
  return labels[category] || category;
}

function getPriorityVariant(
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

export default function ArchivedAnnouncementsPage() {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useAnnouncements({
    status: 'archived',
    ...(search ? { search } : {}),
    page: 1,
    pageSize: 100,
  });

  const restoreAnnouncement = useRestoreAnnouncement();

  const announcements = data?.data || [];

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({
    initialColumn: 'updated_at',
    initialDirection: 'desc',
  });

  const sortedAnnouncements = sortItems(announcements, {
    title: (a) => a.title.toLowerCase(),
    category: (a) => a.category,
    priority: (a) => a.priority,
    updated_at: (a) => a.updated_at,
    created_at: (a) => a.created_at,
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  function handleRestore(announcement: AnnouncementRecord) {
    restoreAnnouncement.mutate(announcement.id, {
      onSuccess: () =>
        addToast({
          variant: 'success',
          title: 'Announcement restored',
          description: `"${announcement.title}" has been restored as a draft.`,
        }),
      onError: () =>
        addToast({
          variant: 'error',
          title: 'Failed to restore announcement',
          description: 'Could not restore the announcement. Please try again.',
        }),
    });
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/announcements"
              className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Archived Announcements
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                View and restore previously archived announcements
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-card border border-border rounded-lg p-4">
            <CardContent className="p-0">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Archived Announcements</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {announcements.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder="Search archived announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <Card className="bg-card border border-border rounded-lg p-8">
            <CardContent className="p-0 text-sm text-zinc-600 dark:text-zinc-400 text-center">
              Loading archived announcements...
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-card border border-border rounded-lg p-8">
            <CardContent className="p-0 text-sm text-rose-600 dark:text-rose-400 text-center">
              Failed to load archived announcements.
            </CardContent>
          </Card>
        ) : announcements.length === 0 ? (
          <Card className="bg-card border border-border rounded-lg p-12">
            <CardContent className="p-0 flex flex-col items-center gap-3">
              <Archive className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
              <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                No archived announcements
              </p>
              <p className="text-sm text-zinc-500">
                Announcements that are archived will appear here.
              </p>
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
                  <SortableTableHead column="priority" {...sortHeadProps}>
                    Priority
                  </SortableTableHead>
                  <SortableTableHead column="updated_at" {...sortHeadProps}>
                    Archived On
                  </SortableTableHead>
                  <SortableTableHead column="created_at" {...sortHeadProps}>
                    Originally Created
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
                    className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <TableCell className="text-sm font-medium text-zinc-900 dark:text-zinc-50 max-w-xs truncate">
                      {announcement.title}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      <Badge variant="outline">{getCategoryLabel(announcement.category)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityVariant(announcement.priority)}>
                        {announcement.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDate(announcement.updated_at)}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDate(announcement.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRestore(announcement)}
                        title="Restore"
                        disabled={restoreAnnouncement.isPending}
                      >
                        <RotateCcw className="h-4 w-4 text-zinc-500 mr-1.5" />
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
