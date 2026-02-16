'use client';

import { useArchiveResource, useResources, useToggleResourceFeatured } from '@/hooks/useResources';
import { type ResourceFiltersValue, Button, Card, CardContent, ResourceCard, ResourceFilters, ResourceGrid } from '@hr-portal/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export default function AdminResourcesPage() {
  const [filters, setFilters] = useState<ResourceFiltersValue>({
    search: '',
    status: 'all',
    category: 'all',
    resourceType: 'all',
  });

  const queryFilters = {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status !== 'all' ? { status: filters.status as 'draft' | 'published' | 'archived' } : {}),
    ...(filters.category !== 'all' ? { category: filters.category as never } : {}),
    ...(filters.resourceType !== 'all'
      ? {
          resourceType: filters.resourceType as
            | 'video'
            | 'document'
            | 'image'
            | 'link'
            | 'presentation'
            | 'interactive',
        }
      : {}),
    page: 1,
    pageSize: 100,
  };

  const { data, isLoading, error } = useResources(queryFilters);
  const archiveResource = useArchiveResource();
  const toggleFeatured = useToggleResourceFeatured();

  const resources = data?.data || [];

  const stats = useMemo(() => {
    const total = resources.length;
    const published = resources.filter((item) => item.status === 'published').length;
    const drafts = resources.filter((item) => item.status === 'draft').length;
    const viewCount = resources.reduce((acc, item) => acc + item.view_count, 0);
    const downloadCount = resources.reduce((acc, item) => acc + item.download_count, 0);
    return { total, published, drafts, viewCount, downloadCount };
  }, [resources]);

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden">
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Resources</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage drafts, published resources, and engagement
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/resources/collections">Collections</Link>
            </Button>
            <Button variant="outline">Bulk Upload</Button>
            <Button variant="outline">Bulk Archive</Button>
            <Button
              asChild
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
            >
              <Link href="/admin/resources/new">Create New</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Published', value: stats.published },
            { label: 'Drafts', value: stats.drafts },
            { label: 'Views', value: stats.viewCount },
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

        <ResourceFilters value={filters} onChange={setFilters} showStatus />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Downloads across listed resources: {stats.downloadCount}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <CardContent className="p-0 text-sm text-zinc-600 dark:text-zinc-400">
              Loading resources...
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <CardContent className="p-0 text-sm text-rose-600 dark:text-rose-400">
              Failed to load resources.
            </CardContent>
          </Card>
        ) : (
          <ResourceGrid
            columns={4}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {resources.map((resource) => (
              <div key={resource.id} className="space-y-2">
                <ResourceCard
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
                  dateLabel={(resource.published_at || resource.created_at).slice(0, 10)}
                  onClick={() => {
                    window.location.href = `/admin/resources/${resource.id}`;
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toggleFeatured.mutate({
                        id: resource.id,
                        featured: !resource.is_featured,
                      })
                    }
                  >
                    {resource.is_featured ? 'Unfeature' : 'Feature'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => archiveResource.mutate(resource.id)}>
                    Archive
                  </Button>
                </div>
              </div>
            ))}
          </ResourceGrid>
        )}
      </div>
    </div>
  );
}
