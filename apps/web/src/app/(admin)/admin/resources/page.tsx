'use client';

import { BulkRecordActionDialog } from '@/components/admin/BulkRecordActionDialog';
import { ServerPagination } from '@/components/data-display/ServerPagination';
import { BulkUploadResourcesDialog } from '@/components/resources/BulkUploadResourcesDialog';
import { useArchiveResource, useResources, useToggleResourceFeatured } from '@/hooks/useResources';
import { queryKeys } from '@/lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { usePendingResources } from '@/hooks/useResources';
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
import {
  Archive,
  FileImage,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Sparkles,
  Star,
  StarOff,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const PAGE_SIZE = 24;

export default function AdminResourcesPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
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
    page,
    pageSize: PAGE_SIZE,
  };

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);

  const { data, isLoading, isFetching, error } = useResources(queryFilters);
  const { data: pendingData } = usePendingResources();
  const archiveResource = useArchiveResource();
  const toggleFeatured = useToggleResourceFeatured();

  const resources = data?.data || [];
  const pagination = data?.pagination;

  // Filters narrow the whole dataset, so a page number from a wider result set
  // could land on an empty page — start over at page 1 on every filter change.
  const handleFiltersChange = (next: ResourceFiltersValue): void => {
    setPage(1);
    setFilters(next);
  };

  const pendingCount = (() => {
    try {
      if (!pendingData || !pendingData.data) return 0;
      const lists = Object.values(pendingData.data as Record<string, any[]>);
      return lists.reduce((acc, list) => acc + (Array.isArray(list) ? list.length : 0), 0);
    } catch (err) {
      return 0;
    }
  })();

  // Status counts come from the API and cover every matching resource. The view
  // total is labelled as page-scoped, since this endpoint exposes no
  // whole-dataset engagement aggregate.
  const stats = useMemo(() => {
    const viewCount = resources.reduce((acc, item) => acc + item.view_count, 0);
    return {
      total: data?.stats?.total ?? pagination?.total ?? 0,
      published: data?.stats?.published ?? 0,
      drafts: data?.stats?.draft ?? 0,
      viewCount,
    };
  }, [data?.stats, pagination?.total, resources]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="p-3">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Resources</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage drafts, published resources, and engagement
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingData && (
              <Button asChild size="sm" variant="outline" className="mr-2">
                <a href="/admin/resources/pending">Pending ({pendingCount})</a>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4 mr-1.5" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/admin/ai-knowledge">
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI Knowledge
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/resources/collections">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Collections
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setBulkUploadOpen(true);
                  }}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Upload
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/resources/archive">
                    <Archive className="mr-2 h-4 w-4" />
                    View Archive
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setBulkArchiveOpen(true);
                  }}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Bulk Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              asChild
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md font-medium"
            >
              <Link href="/admin/resources/new">
                <Plus className="mr-2 h-4 w-4" />
                Create New
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Published', value: stats.published },
            { label: 'Drafts', value: stats.drafts },
            { label: 'Views (this page)', value: stats.viewCount },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border border-border rounded-lg p-4">
              <CardContent className="p-0">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{stat.label}</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <ResourceFilters value={filters} onChange={handleFiltersChange} showStatus />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <ResourceGrid
            columns={4}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="bg-card border border-border rounded-lg overflow-hidden">
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
                      <>
                        <Button
                          size="xs"
                          variant="ghost"
                          className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-sm hover:bg-white dark:hover:bg-zinc-800"
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
                            <>
                              <StarOff className="mr-1 h-3.5 w-3.5" /> Unfeature
                            </>
                          ) : (
                            <>
                              <Star className="mr-1 h-3.5 w-3.5" /> Feature
                            </>
                          )}
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-sm hover:bg-white dark:hover:bg-zinc-800"
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
                      </>
                    }
                  />
                ))}
              </ResourceGrid>
            )}
          </>
        )}

        <ServerPagination
          pagination={pagination}
          onPageChange={setPage}
          isLoading={isFetching}
          itemLabel="resources"
          className="mt-4"
        />
      </div>

      <BulkUploadResourcesDialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen} />
      <BulkRecordActionDialog
        open={bulkArchiveOpen}
        onOpenChange={setBulkArchiveOpen}
        title="Bulk Archive Resources"
        description="Archived resources move out of the active library and can be restored from the archive page. Only resources loaded in the current list are shown."
        emptyTitle="Nothing to archive"
        emptyDescription="Every resource in the current list is already archived."
        actionLabel="Archive"
        actionIcon={<Archive className="mr-1.5 h-4 w-4" />}
        destructive
        items={resources
          .filter((resource) => resource.status !== 'archived')
          .map((resource) => ({
            id: resource.id,
            label: resource.title,
            hint: resource.status,
          }))}
        perform={async (item) => {
          const response = await fetch(`/api/resources/${item.id}/archive`, { method: 'POST' });
          if (!response.ok) {
            const error = await response
              .json()
              .catch(() => ({ error: 'Failed to archive resource' }));
            throw new Error(error.error || 'Failed to archive resource');
          }
        }}
        onCompleted={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
        }}
      />
    </div>
  );
}
