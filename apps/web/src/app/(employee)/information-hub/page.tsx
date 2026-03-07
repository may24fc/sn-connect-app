'use client';

import { useAnnouncementFeed } from '@/hooks/useAnnouncementFeed';
import type { AnnouncementRecord } from '@/hooks/useAnnouncements';
import { useMarkAnnouncementRead } from '@/hooks/useMarkAnnouncementRead';
import {
  useBookmarkResource,
  useRemoveBookmark,
  useResourceBookmarks,
} from '@/hooks/useResourceBookmarks';
import { useFeaturedResources, useRecentResources, useResourceFeed } from '@/hooks/useResourceFeed';
import { formatDate } from '@/lib/format';
import {
  ActiveFilterBadges,
  AnnouncementCard,
  AnnouncementDetailDialog,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CategoryBrowser,
  Input,
  MultiSelectFilter,
  ResourceCard,
  ResourceGrid,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';
import type { FilterOption } from '@hr-portal/ui';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Search,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const categoryLabels: Record<string, string> = {
  onboarding: 'Onboarding',
  training: 'Training',
  policies: 'Policies',
  benefits: 'Benefits',
  tools: 'Tools',
  culture: 'Culture',
  department_specific: 'Department',
  forms_templates: 'Forms',
  performance: 'Performance',
  emergency: 'Emergency',
};

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

export default function InformationHubPage() {
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Array<string>>([]);
  const [selectedReadStatuses, setSelectedReadStatuses] = useState<Array<string>>([]);
  const [announcementPage, setAnnouncementPage] = useState(1);
  const [resourcePage, setResourcePage] = useState(1);
  const [selectedResourceCategory, setSelectedResourceCategory] = useState<string>('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);

  const { data: announcementData, isLoading: isAnnouncementsLoading } = useAnnouncementFeed({
    ...(search ? { search } : {}),
    ...(selectedCategories.length > 0 ? { categories: selectedCategories } : {}),
    ...(selectedReadStatuses.length > 0 ? { readStatuses: selectedReadStatuses } : {}),
    page: announcementPage,
    pageSize: 10,
  });
  const { data: resourceData, isLoading: isResourcesLoading } = useResourceFeed({
    ...(search ? { search } : {}),
    ...(selectedResourceCategory ? { category: selectedResourceCategory } : {}),
    page: resourcePage,
    pageSize: 12,
  });
  const { data: featuredData } = useFeaturedResources();
  const { data: recentData } = useRecentResources();
  const { data: bookmarksData } = useResourceBookmarks();

  const markRead = useMarkAnnouncementRead();
  const addBookmark = useBookmarkResource();
  const removeBookmark = useRemoveBookmark();

  const announcements = announcementData?.data || [];
  const resources = resourceData?.data || [];
  const featuredResources = featuredData?.data || [];
  const recentResources = recentData?.data || [];
  const bookmarks = bookmarksData?.data || [];

  const bookmarkIds = useMemo(
    () => new Set(bookmarks.map((bookmark) => bookmark.resource_id)),
    [bookmarks]
  );

  const resourceCategoryItems = useMemo(() => {
    const counts = resources.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categoryLabels).map(([value, label]) => ({
      value: value as
        | 'onboarding'
        | 'training'
        | 'policies'
        | 'benefits'
        | 'tools'
        | 'culture'
        | 'department_specific'
        | 'forms_templates'
        | 'performance'
        | 'emergency',
      label,
      description: `${label} resources`,
      count: counts[value] || 0,
    }));
  }, [resources]);

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

  const handleBookmarkToggle = (resourceId: string): void => {
    if (bookmarkIds.has(resourceId)) {
      removeBookmark.mutate(resourceId);
      return;
    }

    addBookmark.mutate({ resourceId });
  };

  const handleAnnouncementClick = (announcement: AnnouncementRecord): void => {
    setSelectedAnnouncement(announcement);
    setIsAnnouncementDialogOpen(true);
    if (!announcement.is_read) {
      markRead.mutate(announcement.id);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Information Hub</h1>
        <p className="text-muted-foreground">
          Stay updated with announcements and resources
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
        <Search className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
        <Input
          placeholder="Search announcements and resources"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setAnnouncementPage(1);
            setResourcePage(1);
          }}
        />
      </div>

      <Tabs defaultValue="announcements" className="space-y-6">
        <TabsList>
          <TabsTrigger value="announcements">
            <Megaphone className="mr-2 h-4 w-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="resources">
            <BookOpen className="mr-2 h-4 w-4" />
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-4">
          {/* Filters & Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
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
            {/* Pagination - Gmail style at top */}
            {(announcementData?.pagination.totalPages ?? 1) > 1 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {(announcementPage - 1) * 10 + 1}-
                  {Math.min(announcementPage * 10, announcementData?.pagination.total ?? 0)} of {announcementData?.pagination.total ?? 0}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={announcementPage <= 1}
                    onClick={() => setAnnouncementPage((value) => Math.max(1, value - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={(announcementData?.pagination.totalPages || 1) <= announcementPage}
                    onClick={() => setAnnouncementPage((value) => value + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {urgentAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={`urgent-${announcement.id}`}
              title={announcement.title}
              excerpt={announcement.excerpt || announcement.content.slice(0, 200)}
              category={announcementCategoryLabels[announcement.category] || announcement.category}
              priority={announcement.priority}
              dateLabel={formatDate(announcement.published_at || announcement.created_at)}
              isRead={announcement.is_read}
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
              onClick={() => handleAnnouncementClick(announcement)}
            />
          ))}

          {isAnnouncementsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  // biome-ignore lint: skeleton placeholder
                  key={i}
                  className="bg-card border border-border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ) : regularAnnouncements.length === 0 &&
            pinnedAnnouncements.length === 0 &&
            urgentAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No announcements found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {regularAnnouncements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  title={announcement.title}
                  excerpt={announcement.excerpt || announcement.content.slice(0, 200)}
                  category={announcementCategoryLabels[announcement.category] || announcement.category}
                  priority={announcement.priority}
                  dateLabel={formatDate(announcement.published_at || announcement.created_at)}
                  isRead={announcement.is_read}
                  onClick={() => handleAnnouncementClick(announcement)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          {/* Pagination - Gmail style at top */}
          {(resourceData?.pagination.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-end gap-3">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {(resourcePage - 1) * 12 + 1}-
                {Math.min(resourcePage * 12, resourceData?.pagination.total ?? 0)} of {resourceData?.pagination.total ?? 0}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={resourcePage <= 1}
                  onClick={() => setResourcePage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={(resourceData?.pagination.totalPages || 1) <= resourcePage}
                  onClick={() => setResourcePage((value) => value + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {featuredResources.length > 0 ? (
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                Featured Resources
              </h3>
              <ResourceGrid
                columns={4}
                className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {featuredResources.slice(0, 4).map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    id={resource.id}
                    title={resource.title}
                    excerpt={resource.excerpt}
                    resourceType={resource.resource_type}
                    category={resource.category}
                    status={resource.status}
                    tags={resource.tags}
                    thumbnailPath={resource.thumbnail_path}
                    viewCount={resource.view_count}
                    downloadCount={resource.download_count}
                    bookmarkCount={resource.bookmark_count}
                    isFeatured={resource.is_featured}
                    isPinned={resource.is_pinned}
                    isBookmarked={bookmarkIds.has(resource.id)}
                    dateLabel={formatDate(resource.published_at || resource.created_at)}
                    onClick={() => {
                      window.location.href = `/information-hub/resources/${resource.id}`;
                    }}
                    onBookmark={() => handleBookmarkToggle(resource.id)}
                  />
                ))}
              </ResourceGrid>
            </div>
          ) : null}

          <CategoryBrowser
            categories={resourceCategoryItems}
            selectedCategory={selectedResourceCategory}
            onSelect={(category) => {
              setSelectedResourceCategory(category === selectedResourceCategory ? '' : category);
              setResourcePage(1);
            }}
          />

          {isResourcesLoading ? (
            <Card>
              <CardContent className="p-6 text-sm text-zinc-600 dark:text-zinc-400">
                Loading resources...
              </CardContent>
            </Card>
          ) : (
            <ResourceGrid
              columns={4}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {resources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  id={resource.id}
                  title={resource.title}
                  excerpt={resource.excerpt}
                  resourceType={resource.resource_type}
                  category={resource.category}
                  status={resource.status}
                  tags={resource.tags}
                  thumbnailPath={resource.thumbnail_path}
                  viewCount={resource.view_count}
                  downloadCount={resource.download_count}
                  bookmarkCount={resource.bookmark_count}
                  isFeatured={resource.is_featured}
                  isPinned={resource.is_pinned}
                  isBookmarked={bookmarkIds.has(resource.id)}
                  dateLabel={formatDate(resource.published_at || resource.created_at)}
                  onClick={() => {
                    window.location.href = `/information-hub/resources/${resource.id}`;
                  }}
                  onBookmark={() => handleBookmarkToggle(resource.id)}
                />
              ))}
            </ResourceGrid>
          )}

          {recentResources.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recently Viewed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentResources.slice(0, 5).map((resource) => (
                  <div key={resource.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-700 dark:text-zinc-300">{resource.title}</span>
                    <Link
                      href={`/information-hub/resources/${resource.id}`}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Open
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>


      </Tabs>

      {/* Announcement Detail Dialog */}
      <AnnouncementDetailDialog
        open={isAnnouncementDialogOpen}
        onOpenChange={setIsAnnouncementDialogOpen}
        announcement={selectedAnnouncement}
      />
    </div>
  );
}
