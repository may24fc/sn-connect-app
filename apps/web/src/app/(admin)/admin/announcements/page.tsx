'use client';

import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useArchiveAnnouncement, useToggleAnnouncementPin } from '@/hooks/usePublishAnnouncement';
import {
  AnnouncementCard,
  AnnouncementFilters,
  type AnnouncementFiltersValue,
  Button,
  Card,
  CardContent,
} from '@hr-portal/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export default function AdminAnnouncementsPage() {
  const [filters, setFilters] = useState<AnnouncementFiltersValue>({
    search: '',
    status: 'all',
    category: 'all',
    priority: 'all',
  });

  const queryFilters = {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status !== 'all' ? { status: filters.status as string } : {}),
    ...(filters.category !== 'all' ? { category: filters.category as string } : {}),
    ...(filters.priority !== 'all' ? { priority: filters.priority as string } : {}),
    page: 1,
    pageSize: 100,
  };

  const { data, isLoading, error } = useAnnouncements(queryFilters);
  const archiveAnnouncement = useArchiveAnnouncement();
  const togglePin = useToggleAnnouncementPin();

  const announcements = data?.data || [];

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
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Announcements</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage scheduled and published company announcements
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Bulk Archive</Button>
            <Button variant="outline">Bulk Delete</Button>
            <Button
              asChild
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
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
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
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
          <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <CardContent className="p-0 text-sm text-zinc-600 dark:text-zinc-400">
              Loading announcements...
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <CardContent className="p-0 text-sm text-rose-600 dark:text-rose-400">
              Failed to load announcements.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="space-y-2">
                <AnnouncementCard
                  title={announcement.title}
                  excerpt={announcement.excerpt || announcement.content.slice(0, 200)}
                  category={announcement.category}
                  priority={announcement.priority}
                  status={announcement.status}
                  dateLabel={
                    announcement.published_at
                      ? announcement.published_at.slice(0, 10)
                      : announcement.created_at.slice(0, 10)
                  }
                  isPinned={announcement.is_pinned}
                  onClick={() => {
                    window.location.href = `/admin/announcements/${announcement.id}`;
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      togglePin.mutate({ id: announcement.id, pinned: !announcement.is_pinned })
                    }
                  >
                    {announcement.is_pinned ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => archiveAnnouncement.mutate(announcement.id)}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
