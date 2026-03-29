'use client';

import { useAnnouncementFeed } from '@/hooks/useAnnouncementFeed';
import type { AnnouncementRecord } from '@/hooks/useAnnouncements';
import { useStarAnnouncement, useStarredAnnouncements, useUnstarAnnouncement } from '@/hooks/useAnnouncementStars';
import { useMarkAnnouncementRead } from '@/hooks/useMarkAnnouncementRead';
import { formatDate } from '@/lib/format';
import {
  ActiveFilterBadges,
  AnnouncementCard,
  AnnouncementDetailDialog,
  Button,
  CountBadge,
  Input,
  MultiSelectFilter,
  Skeleton,
  useToast,
} from '@hr-portal/ui';
import type { FilterOption } from '@hr-portal/ui';
import { ChevronLeft, ChevronRight, Search, Star } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const announcementCategoryLabels: Record<string, string> = {
  hr_updates: 'HR Updates',
  benefits: 'Benefits',
  events: 'Events',
  performance: 'Performance',
  training: 'Training',
  policy: 'Policy',
  general: 'General',
  emergency: 'Emergency',
};

const announcementCategoryOptions: Array<FilterOption> = Object.entries(
  announcementCategoryLabels
).map(([value, label]) => ({ value, label }));

const readStatusOptions: Array<FilterOption> = [
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
];

export default function AnnouncementsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Array<string>>([]);
  const [selectedReadStatuses, setSelectedReadStatuses] = useState<Array<string>>([]);
  const [announcementPage, setAnnouncementPage] = useState(1);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);

  const { data: announcementData, isLoading: isAnnouncementsLoading } = useAnnouncementFeed({
    ...(search ? { search } : {}),
    ...(selectedCategories.length > 0 ? { categories: selectedCategories } : {}),
    ...(selectedReadStatuses.length > 0 ? { readStatuses: selectedReadStatuses } : {}),
    page: announcementPage,
    pageSize: 10,
  });

  const markRead = useMarkAnnouncementRead();
  const starAnnouncement = useStarAnnouncement();
  const unstarAnnouncement = useUnstarAnnouncement();
  const { data: starredData } = useStarredAnnouncements();
  const { addToast } = useToast();

  const starredIds = useMemo(
    () => new Set((starredData?.data || []).map((s) => s.announcement_id)),
    [starredData]
  );

  const announcements = announcementData?.data || [];
  const pinnedAnnouncements = announcements.filter((announcement) => announcement.is_pinned);
  const urgentAnnouncements = announcements.filter(
    (announcement) => announcement.priority === 'urgent'
  );
  const pinnedOrUrgentIds = useMemo(
    () =>
      new Set([...pinnedAnnouncements.map((a) => a.id), ...urgentAnnouncements.map((a) => a.id)]),
    [pinnedAnnouncements, urgentAnnouncements]
  );
  const regularAnnouncements = useMemo(
    () => announcements.filter((a) => !pinnedOrUrgentIds.has(a.id)),
    [announcements, pinnedOrUrgentIds]
  );

  const handleAnnouncementClick = (announcement: AnnouncementRecord): void => {
    setSelectedAnnouncement(announcement);
    setIsAnnouncementDialogOpen(true);
    if (!announcement.is_read) {
      markRead.mutate(announcement.id);
    }
  };

  const handleStarToggle = (announcementId: string): void => {
    if (starredIds.has(announcementId)) {
      unstarAnnouncement.mutate(announcementId, {
        onSuccess: () => addToast({ title: 'Removed from starred', variant: 'success' }),
      });
    } else {
      starAnnouncement.mutate(announcementId, {
        onSuccess: () => addToast({ title: 'Announcement starred', variant: 'success' }),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-muted-foreground">
            Stay informed with the latest company announcements
          </p>
        </div>
        <Link href="/announcements/starred">
          <Button variant="outline" size="sm" className="flex items-center gap-2 shrink-0">
            <Star className="h-4 w-4" />
            My Starred
            {starredIds.size > 0 && (
              <CountBadge className="ml-1" variant="accent" size="md" count={starredIds.size} />
            )}
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {/* Filters & Pagination */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              placeholder="Search announcements"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setAnnouncementPage(1);
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <MultiSelectFilter
              label="Category"
              options={announcementCategoryOptions}
              selected={selectedCategories}
              onSelectionChange={(values) => {
                setSelectedCategories(values);
                setAnnouncementPage(1);
              }}
            />
            <MultiSelectFilter
              label="Status"
              options={readStatusOptions}
              selected={selectedReadStatuses}
              onSelectionChange={(values) => {
                setSelectedReadStatuses(values);
                setAnnouncementPage(1);
              }}
            />
            <ActiveFilterBadges
              options={[...announcementCategoryOptions, ...readStatusOptions]}
              selected={[...selectedCategories, ...selectedReadStatuses]}
              onRemove={(value) => {
                if (selectedCategories.includes(value)) {
                  setSelectedCategories((prev) => prev.filter((v) => v !== value));
                } else {
                  setSelectedReadStatuses((prev) => prev.filter((v) => v !== value));
                }
                setAnnouncementPage(1);
              }}
            />
          </div>
          {(announcementData?.pagination.totalPages ?? 1) > 1 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {(announcementPage - 1) * 10 + 1}-
                {Math.min(announcementPage * 10, announcementData?.pagination.total ?? 0)} of{' '}
                {announcementData?.pagination.total ?? 0}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Previous page"
                  disabled={announcementPage <= 1}
                  onClick={() => setAnnouncementPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Next page"
                  disabled={(announcementData?.pagination.totalPages || 1) <= announcementPage}
                  onClick={() => setAnnouncementPage((value) => value + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div>
          {urgentAnnouncements.map((announcement) => (
          <AnnouncementCard
            key={`urgent-${announcement.id}`}
            title={announcement.title}
            excerpt={announcement.excerpt || announcement.content.slice(0, 200)}
            category={announcementCategoryLabels[announcement.category] || announcement.category}
            priority={announcement.priority}
            dateLabel={formatDate(announcement.published_at || announcement.created_at)}
            isRead={announcement.is_read}
            isStarred={starredIds.has(announcement.id)}
            onStar={() => handleStarToggle(announcement.id)}
            onClick={() => handleAnnouncementClick(announcement)}
            />
          ))}

          {pinnedAnnouncements.map((announcement) => (
          <AnnouncementCard
            key={`pinned-${announcement.id}`}
            title={announcement.title}
            excerpt={announcement.excerpt || announcement.content.slice(0, 200)}
            category={announcementCategoryLabels[announcement.category] || announcement.category}
            priority={announcement.priority}
            dateLabel={formatDate(announcement.published_at || announcement.created_at)}
            isPinned
            isRead={announcement.is_read}
            isStarred={starredIds.has(announcement.id)}
            onStar={() => handleStarToggle(announcement.id)}
            onClick={() => handleAnnouncementClick(announcement)}
            />
          ))}

          {isAnnouncementsLoading ? (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  // biome-ignore lint: skeleton placeholder
                  key={i}
                  className="flex items-center gap-3 px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800"
                >
                  <Skeleton className="h-2 w-2 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-28 shrink-0" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-20 shrink-0" />
                </div>
              ))}
            </>
          ) : regularAnnouncements.length === 0 &&
            pinnedAnnouncements.length === 0 &&
            urgentAnnouncements.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No announcements found.
            </div>
          ) : (
            regularAnnouncements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                title={announcement.title}
                excerpt={announcement.excerpt || announcement.content.slice(0, 200)}
                category={
                  announcementCategoryLabels[announcement.category] || announcement.category
                }
                priority={announcement.priority}
                dateLabel={formatDate(announcement.published_at || announcement.created_at)}
                isRead={announcement.is_read}
                isStarred={starredIds.has(announcement.id)}
                onStar={() => handleStarToggle(announcement.id)}
                onClick={() => handleAnnouncementClick(announcement)}
              />
            ))
          )}
        </div>
      </div>

      <AnnouncementDetailDialog
        open={isAnnouncementDialogOpen}
        onOpenChange={setIsAnnouncementDialogOpen}
        announcement={selectedAnnouncement}
        isStarred={selectedAnnouncement ? starredIds.has(selectedAnnouncement.id) : false}
        {...(selectedAnnouncement
          ? { onStar: () => handleStarToggle(selectedAnnouncement.id) }
          : {})}
      />
    </div>
  );
}
