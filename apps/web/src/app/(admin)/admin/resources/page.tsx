'use client';

import { useArchiveResource, useResources, useToggleResourceFeatured } from '@/hooks/useResources';
import { formatDate } from '@/lib/format';
import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ResourceCard,
  ResourceFilters,
  type ResourceFiltersValue,
  ResourceGrid,
  Skeleton,
  useToast,
} from '@hr-portal/ui';
import { Archive, FileImage, FolderOpen, MoreHorizontal, Star, StarOff, Upload } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export default function AdminResourcesPage() {
  const { addToast } = useToast();
  const [filters, setFilters] = useState<ResourceFiltersValue>({
    search: '',
    status: 'all',
    category: 'all',
    resourceType: 'all',
  });

  const queryFilters = {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status !== 'all'
      ? { status: filters.status as 'draft' | 'published' | 'archived' }
      : {}),
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
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-card p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Resources</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage drafts, published resources, and engagement
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4 mr-1.5" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/admin/resources/collections">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Collections
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Upload
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Archive className="mr-2 h-4 w-4" />
                  Bulk Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              className="bg-card border border-border rounded-lg p-4"
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
          <ResourceGrid
            columns={4}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {[...Array(8)].map((_, i) => (
              <Card
                key={i}
                className="bg-card border border-border rounded-lg overflow-hidden"
              >
                <Skeleton className="h-48 w-full rounded-none" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2 mt-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </ResourceGrid>
        ) : error ? (
          <Card className="bg-card border border-border rounded-lg p-4">
            <CardContent className="p-0 text-sm text-rose-600 dark:text-rose-400">
              Failed to load resources.
            </CardContent>
          </Card>
        ) : (
          <>
            {resources.length === 0 ? (
              <EmptyState
                icon={FileImage}
                title="No resources found"
                description="No resources match your current filters. Try adjusting your search or create a new resource."
                action={{
                  label: 'Create Resource',
                  onClick: () => window.location.assign('/admin/resources/new'),
                }}
              />
            ) : (
              <ResourceGrid
                columns={4}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
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
                    dateLabel={formatDate(resource.published_at || resource.created_at)}
                    onClick={() => {
                      window.location.href = `/admin/resources/${resource.id}`;
                    }}
                    actions={
                      // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation prevents card click
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            toggleFeatured.mutate(
                              {
                                id: resource.id,
                                featured: !resource.is_featured,
                              },
                              {
                                onSuccess: () => {
                                  addToast({
                                    title: resource.is_featured
                                      ? 'Resource unfeatured'
                                      : 'Resource featured',
                                    description: 'Changes saved successfully',
                                    variant: 'success',
                                  });
                                },
                                onError: () => {
                                  addToast({
                                    title: 'Error',
                                    description: 'Failed to update resource',
                                    variant: 'error',
                                  });
                                },
                              }
                            )
                          }
                        >
                          {resource.is_featured ? (
                            <><StarOff className="mr-1 h-3.5 w-3.5" /> Unfeature</>
                          ) : (
                            <><Star className="mr-1 h-3.5 w-3.5" /> Feature</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            archiveResource.mutate(resource.id, {
                              onSuccess: () => {
                                addToast({
                                  title: 'Resource archived',
                                  description: 'Resource moved to archive',
                                  variant: 'success',
                                });
                              },
                              onError: () => {
                                addToast({
                                  title: 'Error',
                                  description: 'Failed to archive resource',
                                  variant: 'error',
                                });
                              },
                            })
                          }
                        >
                          <Archive className="mr-1 h-3.5 w-3.5" /> Archive
                        </Button>
                      </div>
                    }
                  />
                ))}
              </ResourceGrid>
            )}
          </>
        )}
      </div>
    </div>
  );
}
