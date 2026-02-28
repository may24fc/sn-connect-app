'use client';

import {
  useBookmarkResource,
  useRemoveBookmark,
  useResourceBookmarks,
  useTrackResourceView,
} from '@/hooks/useResourceBookmarks';
import { useResourcesByCategory } from '@/hooks/useResourceFeed';
import { useResource } from '@/hooks/useResources';
import { formatDate } from '@/lib/format';
import {
  Button,
  DocumentViewer,
  type ResourceAccessLevel,
  ResourceCard,
  ResourceGrid,
  VideoPlayer,
} from '@hr-portal/ui';
import { Bookmark, CheckCircle2, Download } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [resourceId, setResourceId] = useState<string>('');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamAccessLevel, setStreamAccessLevel] = useState<ResourceAccessLevel>('full');

  useEffect(() => {
    params.then((value) => setResourceId(value.id));
  }, [params]);

  const { data, isLoading } = useResource(resourceId);
  const { data: bookmarksData } = useResourceBookmarks();
  const { data: relatedData } = useResourcesByCategory(data?.data.category || '');
  const bookmarkResource = useBookmarkResource();
  const removeBookmark = useRemoveBookmark();
  const trackView = useTrackResourceView();

  const resource = data?.data;
  const bookmarkIds = useMemo(
    () => new Set((bookmarksData?.data || []).map((bookmark) => bookmark.resource_id)),
    [bookmarksData]
  );

  useEffect(() => {
    if (!resourceId) return;
    trackView.mutate({ resourceId });
  }, [resourceId, trackView]);

  // Fetch signed stream URL for video resources
  useEffect(() => {
    if (!resource || resource.resource_type !== 'video') return;

    const fetchStreamUrl = async () => {
      try {
        const response = await fetch(`/api/resources/${resource.id}/stream`);
        if (!response.ok) return;
        const payload = await response.json();
        if (payload?.data?.url) {
          setStreamUrl(payload.data.url);
          setStreamAccessLevel(payload.data.accessLevel ?? 'full');
        }
      } catch {
        // Fallback to direct URL if stream endpoint fails
      }
    };

    fetchStreamUrl();

    // Refresh signed URL before it expires (every 4 minutes for view_only, 14 for full)
    const refreshInterval = setInterval(
      fetchStreamUrl,
      resource.access_level === 'view_only' ? 4 * 60 * 1000 : 14 * 60 * 1000
    );

    return () => clearInterval(refreshInterval);
  }, [resource]);

  const isViewOnly = streamAccessLevel === 'view_only';

  if (isLoading || !resource) {
    return <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading resource...</div>;
  }

  const isBookmarked = bookmarkIds.has(resource.id);
  const isVideo = resource.resource_type === 'video';
  const isDocument = resource.resource_type === 'document';
  const relatedResources = (relatedData?.data || [])
    .filter((item) => item.id !== resource.id)
    .slice(0, 3);

  const handleDownload = useCallback(async (): Promise<void> => {
    const response = await fetch(`/api/resources/${resource.id}/download`);
    if (!response.ok) {
      const payload = await response.json();
      if (response.status === 403) {
        alert(payload?.error ?? 'This resource is view-only and cannot be downloaded.');
        return;
      }
      return;
    }
    const payload = await response.json();
    if (payload?.data?.url) {
      window.open(payload.data.url, '_blank', 'noopener,noreferrer');
    }
  }, [resource.id]);

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden -m-4 lg:-m-6">
      <div className="border-b border-border bg-card px-6 py-3 text-sm">
        <Link
          href="/information-hub"
          className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Information Hub
        </Link>
        <span className="mx-2 text-muted-foreground">/</span>
        <Link
          href={`/information-hub/resources/category/${resource.category}`}
          className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {resource.category}
        </Link>
        <span className="mx-2 text-muted-foreground">/</span>
        <span className="text-zinc-900 dark:text-zinc-50">{resource.title}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-zinc-900 aspect-video w-full">
          {isVideo ? (
            <VideoPlayer
              src={streamUrl || resource.external_url || resource.file_path || ''}
              title={resource.title}
              className="rounded-none"
              accessLevel={streamAccessLevel}
              onTimeUpdate={(time) => setDurationSeconds(Math.floor(time))}
              {...(resource.thumbnail_path ? { poster: resource.thumbnail_path } : {})}
            />
          ) : isDocument ? (
            <DocumentViewer
              src={resource.external_url || resource.file_path || ''}
              fileName={resource.title}
              className="rounded-none border-0"
              onDownload={handleDownload}
              {...(resource.mime_type ? { mimeType: resource.mime_type } : {})}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-300">
              No inline preview available
            </div>
          )}
        </div>

        <div className="bg-card border-b border-border p-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{resource.title}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
            {resource.description || resource.excerpt}
          </p>

          <div className="flex items-center gap-3 mt-4">
            <Button
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
              onClick={() => {
                if (isBookmarked) {
                  removeBookmark.mutate(resource.id);
                } else {
                  bookmarkResource.mutate({ resourceId: resource.id });
                }
              }}
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-white' : ''}`} />
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 px-4 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={handleDownload}
              disabled={isViewOnly}
              title={isViewOnly ? 'This resource is view-only' : 'Download resource'}
            >
              <Download className="h-4 w-4" />
              {isViewOnly ? 'View Only' : 'Download'}
            </Button>

            <Button
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md"
              onClick={() =>
                trackView.mutate({ resourceId: resource.id, completed: true, durationSeconds })
              }
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark as Completed
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Related Resources
          </h2>
          <ResourceGrid
            columns={3}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {relatedResources.map((item) => (
              <ResourceCard
                key={item.id}
                id={item.id}
                title={item.title}
                excerpt={item.excerpt}
                resourceType={item.resource_type}
                category={item.category}
                tags={item.tags}
                thumbnailPath={item.thumbnail_path}
                viewCount={item.view_count}
                downloadCount={item.download_count}
                bookmarkCount={item.bookmark_count}
                dateLabel={formatDate(item.published_at || item.created_at)}
                onClick={() => {
                  window.location.href = `/information-hub/resources/${item.id}`;
                }}
              />
            ))}
          </ResourceGrid>
        </div>
      </div>
    </div>
  );
}
