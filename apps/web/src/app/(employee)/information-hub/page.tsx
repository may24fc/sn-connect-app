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
import {
  AnnouncementDetailDialog,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CategoryBrowser,
  Input,
  Progress,
  ResourceCard,
  ResourceGrid,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';
import {
  ArrowRight,
  Award,
  BookOpen,
  Megaphone,
  Search,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

interface GrowthItem {
  id: string;
  title: string;
  description: string;
  progress: number;
  dueDate?: string;
  type: 'course' | 'goal' | 'achievement';
}

const growthItems: Array<GrowthItem> = [
  {
    id: '1',
    title: 'Leadership Fundamentals',
    description: 'Complete the leadership training course',
    progress: 75,
    dueDate: 'Feb 28, 2026',
    type: 'course',
  },
  {
    id: '2',
    title: 'Q1 Performance Goals',
    description: 'Achieve quarterly performance targets',
    progress: 40,
    dueDate: 'Mar 31, 2026',
    type: 'goal',
  },
  {
    id: '3',
    title: 'Communication Skills',
    description: 'Complete the effective communication workshop',
    progress: 100,
    type: 'course',
  },
];

const typeIcons: Record<GrowthItem['type'], typeof BookOpen> = {
  course: BookOpen,
  goal: Target,
  achievement: Award,
};

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

export default function InformationHubPage() {
  const [search, setSearch] = useState('');
  const [announcementCategory, setAnnouncementCategory] = useState('all');
  const [readStatus, setReadStatus] = useState<'all' | 'read' | 'unread'>('all');
  const [announcementPage, setAnnouncementPage] = useState(1);
  const [resourcePage, setResourcePage] = useState(1);
  const [selectedResourceCategory, setSelectedResourceCategory] = useState<string>('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);

  const { data: announcementData, isLoading: isAnnouncementsLoading } = useAnnouncementFeed({
    ...(search ? { search } : {}),
    ...(announcementCategory !== 'all' ? { category: announcementCategory as never } : {}),
    readStatus,
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

  const announcementCategories = useMemo(
    () => ['all', ...new Set(announcements.map((announcement) => announcement.category))],
    [announcements]
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

  const completedCourses = growthItems.filter((item) => item.progress === 100).length;

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
          Stay updated with announcements, resources, and your growth plans
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex items-center gap-3">
        <Search className="h-4 w-4 text-zinc-500" />
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
          <TabsTrigger value="growth">
            <TrendingUp className="mr-2 h-4 w-4" />
            My Growth
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            {announcementCategories.map((item) => (
              <Button
                key={item}
                variant={announcementCategory === item ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setAnnouncementCategory(item);
                  setAnnouncementPage(1);
                }}
              >
                {item}
              </Button>
            ))}
            <Button
              variant={readStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setReadStatus('all')}
            >
              All
            </Button>
            <Button
              variant={readStatus === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setReadStatus('unread')}
            >
              Unread
            </Button>
            <Button
              variant={readStatus === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setReadStatus('read')}
            >
              Read
            </Button>
          </div>

          {urgentAnnouncements.map((announcement) => (
            <div
              key={`urgent-${announcement.id}`}
              className="bg-rose-50 dark:bg-rose-950/30 border-l-4 border-rose-600 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleAnnouncementClick(announcement)}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {announcement.title}
                </h3>
                <Badge variant="destructive">Urgent</Badge>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
                {announcement.excerpt || announcement.content.slice(0, 200)}
              </p>
            </div>
          ))}

          {pinnedAnnouncements.map((announcement) => (
            <div
              key={`pinned-${announcement.id}`}
              className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50 border-l-4 border-indigo-600 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleAnnouncementClick(announcement)}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {announcement.title}
                </h3>
                <Badge>Pinned</Badge>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
                {announcement.excerpt || announcement.content.slice(0, 200)}
              </p>
            </div>
          ))}

          {isAnnouncementsLoading ? (
            <Card>
              <CardContent className="p-6 text-sm text-zinc-600 dark:text-zinc-400">
                Loading announcements...
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={
                    announcement.is_read
                      ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 opacity-75 cursor-pointer hover:shadow-md transition-shadow'
                      : 'bg-white dark:bg-zinc-900 border-l-4 border-indigo-600 border-r border-t border-b border-zinc-200 dark:border-zinc-800 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow'
                  }
                  onClick={() => handleAnnouncementClick(announcement)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {announcement.title}
                    </h3>
                    {!announcement.is_read ? (
                      <Badge>Unread</Badge>
                    ) : (
                      <Badge variant="secondary">Read</Badge>
                    )}
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-3">
                    {announcement.excerpt || announcement.content.slice(0, 200)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
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
                    dateLabel={(resource.published_at || resource.created_at).slice(0, 10)}
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
                  dateLabel={(resource.published_at || resource.created_at).slice(0, 10)}
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

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              disabled={resourcePage <= 1}
              onClick={() => setResourcePage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Page {resourcePage}</span>
            <Button
              variant="outline"
              disabled={(resourceData?.pagination.totalPages || 1) <= resourcePage}
              onClick={() => setResourcePage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {growthItems.length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {completedCourses}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Avg Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {Math.round(
                    growthItems.reduce((sum, item) => sum + item.progress, 0) / growthItems.length
                  )}
                  %
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4">
            {growthItems.map((item) => {
              const Icon = typeIcons[item.type];

              return (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          {item.title}
                        </CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </div>
                      <Badge
                        variant={
                          item.progress === 100
                            ? 'success'
                            : item.progress >= 60
                              ? 'warning'
                              : 'secondary'
                        }
                      >
                        {item.progress}%
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <Progress value={item.progress} className="h-2" />

                    <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                      <span>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span>
                      {item.dueDate ? <span>Due: {item.dueDate}</span> : null}
                    </div>

                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
