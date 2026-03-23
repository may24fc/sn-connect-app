'use client';

import {
  useBookmarkResource,
  useRemoveBookmark,
  useResourceBookmarks,
} from '@/hooks/useResourceBookmarks';
import { useFeaturedResources, useRecentResources, useResourceFeed } from '@/hooks/useResourceFeed';
import { formatDate } from '@/lib/format';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CategoryBrowser,
  Input,
  ResourceCard,
  ResourceGrid,
  useToast,
} from '@hr-portal/ui';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
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

export default function ResourcesPage() {
  const [search, setSearch] = useState('');
  const [resourcePage, setResourcePage] = useState(1);
  const [selectedResourceCategory, setSelectedResourceCategory] = useState<string>('');

  const { data: resourceData, isLoading: isResourcesLoading } = useResourceFeed({
    ...(search ? { search } : {}),
    ...(selectedResourceCategory ? { category: selectedResourceCategory } : {}),
    page: resourcePage,
    pageSize: 12,
  });
  const { data: featuredData } = useFeaturedResources();
  const { data: recentData } = useRecentResources();
  const { data: bookmarksData } = useResourceBookmarks();

  const addBookmark = useBookmarkResource();
  const removeBookmark = useRemoveBookmark();
  const { addToast } = useToast();

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

  const handleBookmarkToggle = (resourceId: string): void => {
    if (bookmarkIds.has(resourceId)) {
      removeBookmark.mutate(resourceId, {
        onSuccess: () => addToast({ title: 'Bookmark removed', variant: 'success' }),
      });
      return;
    }

    addBookmark.mutate({ resourceId }, {
      onSuccess: () => addToast({ title: 'Resource bookmarked', variant: 'success' }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resources</h1>
          <p className="text-muted-foreground">
            Browse and discover company resources
          </p>
        </div>
        <Link href="/information-hub/resources/bookmarks">
          <Button variant="outline" size="sm" className="flex items-center gap-2 shrink-0">
            <Bookmark className="h-4 w-4" />
            My Bookmarks
            {bookmarks.length > 0 && (
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                {bookmarks.length}
              </span>
            )}
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search resources"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setResourcePage(1);
          }}
        />
      </div>

      <div className="space-y-6">
        {/* Pagination - Gmail style at top */}
        {(resourceData?.pagination.totalPages ?? 1) > 1 && (
          <div className="flex items-center justify-end gap-3">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {(resourcePage - 1) * 12 + 1}-
              {Math.min(resourcePage * 12, resourceData?.pagination.total ?? 0)} of{' '}
              {resourceData?.pagination.total ?? 0}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Previous page"
                disabled={resourcePage <= 1}
                onClick={() => setResourcePage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Next page"
                disabled={(resourceData?.pagination.totalPages || 1) <= resourcePage}
                onClick={() => setResourcePage((value) => value + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {featuredResources.length > 0 ? (
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-950/50 dark:to-slate-900/50 rounded-lg p-6 border border-slate-200 dark:border-slate-800">
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
                    className="text-slate-700 dark:text-slate-400 hover:underline"
                  >
                    Open
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
