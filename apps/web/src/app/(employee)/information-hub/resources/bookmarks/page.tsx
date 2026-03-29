'use client';

import { useRemoveBookmark, useResourceBookmarks } from '@/hooks/useResourceBookmarks';
import { formatDate } from '@/lib/format';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ResourceCard,
  ResourceGrid,
  useToast,
} from '@hr-portal/ui';
import { Bookmark } from 'lucide-react';
import Link from 'next/link';

export default function ResourceBookmarksPage() {
  const { data, isLoading } = useResourceBookmarks();
  const removeBookmark = useRemoveBookmark();
  const { addToast } = useToast();

  const handleRemoveBookmark = (resourceId: string): void => {
    removeBookmark.mutate(resourceId, {
      onSuccess: () => addToast({ title: 'Bookmark removed', variant: 'success' }),
      onError: () => addToast({ title: 'Failed to remove bookmark', variant: 'error' }),
    });
  };

  const bookmarks = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/information-hub" className="hover:underline">
            Information Hub
          </Link>{' '}
          / Resource Bookmarks
        </p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          My Bookmarked Resources
        </h1>
      </div>

      {isLoading ? (
        <EmptyState
          icon={<Bookmark className="h-5 w-5" />}
          title="Loading bookmarks"
          description="Your bookmarked resources are still loading."
          size="sm"
        />
      ) : bookmarks.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Bookmark}
              title="No bookmarked resources yet"
              description="Bookmark resources from the information hub to keep them saved here."
              action={{ label: 'Browse resources', href: '/information-hub' }}
              size="sm"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <ResourceGrid
            columns={3}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {bookmarks.map((bookmark) => {
              if (!bookmark.resource) return null;

              return (
                <div key={bookmark.id} className="space-y-2">
                  <ResourceCard
                    id={bookmark.resource.id}
                    title={bookmark.resource.title}
                    excerpt={bookmark.resource.excerpt}
                    resourceType={bookmark.resource.resource_type}
                    category={bookmark.resource.category}
                    status={bookmark.resource.status}
                    tags={bookmark.resource.tags}
                    thumbnailPath={bookmark.resource.thumbnail_path}
                    viewCount={bookmark.resource.view_count}
                    downloadCount={bookmark.resource.download_count}
                    bookmarkCount={bookmark.resource.bookmark_count}
                    isBookmarked
                    dateLabel={formatDate(
                      bookmark.resource.published_at || bookmark.resource.created_at
                    )}
                    onClick={() => {
                      window.location.href = `/information-hub/resources/${bookmark.resource_id}`;
                    }}
                    onBookmark={() => handleRemoveBookmark(bookmark.resource_id)}
                  />

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Personal Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {bookmark.notes || 'No notes added.'}
                      </p>
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveBookmark(bookmark.resource_id)}
                      >
                        Remove Bookmark
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </ResourceGrid>
        </div>
      )}
    </div>
  );
}
