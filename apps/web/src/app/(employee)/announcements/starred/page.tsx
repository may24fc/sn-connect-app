'use client';

import type { AnnouncementRecord } from '@/hooks/useAnnouncements';
import { useStarAnnouncement, useStarredAnnouncements, useUnstarAnnouncement } from '@/hooks/useAnnouncementStars';
import { useMarkAnnouncementRead } from '@/hooks/useMarkAnnouncementRead';
import { formatDate } from '@/lib/format';
import {
  AnnouncementCard,
  AnnouncementDetailDialog,
  Card,
  CardContent,
  useToast,
} from '@hr-portal/ui';
import Link from 'next/link';
import { useState } from 'react';

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

export default function StarredAnnouncementsPage() {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading } = useStarredAnnouncements();
  const markRead = useMarkAnnouncementRead();
  const starAnnouncement = useStarAnnouncement();
  const unstarAnnouncement = useUnstarAnnouncement();
  const { addToast } = useToast();

  const starred = data?.data || [];

  const handleAnnouncementClick = (announcement: AnnouncementRecord): void => {
    setSelectedAnnouncement(announcement);
    setIsDialogOpen(true);
    if (!announcement.is_read) {
      markRead.mutate(announcement.id);
    }
  };

  const handleStarToggle = (announcementId: string): void => {
    const isCurrentlyStarred = starred.some((s) => s.announcement_id === announcementId);
    if (isCurrentlyStarred) {
      unstarAnnouncement.mutate(announcementId, {
        onSuccess: () => addToast({ title: 'Removed from starred', variant: 'success' }),
        onError: () => addToast({ title: 'Failed to unstar', variant: 'error' }),
      });
    } else {
      starAnnouncement.mutate(announcementId, {
        onSuccess: () => addToast({ title: 'Announcement starred', variant: 'success' }),
        onError: () => addToast({ title: 'Failed to star', variant: 'error' }),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/announcements" className="hover:underline">
            Announcements
          </Link>{' '}
          / My Starred
        </p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">My Starred Announcements</h1>
      </div>

      {isLoading ? (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading starred announcements...</div>
      ) : starred.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-zinc-600 dark:text-zinc-400">
            No starred announcements yet. Star announcements from the{' '}
            <Link href="/announcements" className="text-indigo-600 hover:underline">
              Announcements page
            </Link>{' '}
            to see them here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {starred.map((item) => {
            if (!item.announcement) return null;
            const announcement = item.announcement;
            return (
              <AnnouncementCard
                key={item.id}
                title={announcement.title}
                excerpt={announcement.excerpt || announcement.content.slice(0, 200)}
                category={announcementCategoryLabels[announcement.category] || announcement.category}
                priority={announcement.priority}
                dateLabel={formatDate(announcement.published_at || announcement.created_at)}
                isRead={announcement.is_read}
                isStarred
                onStar={() => handleStarToggle(announcement.id)}
                onClick={() => handleAnnouncementClick(announcement)}
              />
            );
          })}
        </div>
      )}

      <AnnouncementDetailDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        announcement={selectedAnnouncement}
        isStarred={selectedAnnouncement ? starred.some((s) => s.announcement_id === selectedAnnouncement.id) : false}
        {...(selectedAnnouncement
          ? { onStar: () => handleStarToggle(selectedAnnouncement.id) }
          : {})}
      />
    </div>
  );
}
