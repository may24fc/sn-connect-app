'use client';

import { useResourceFeed } from '@/hooks/useResourceFeed';
import {
  Button,
  ResourceCard,
  ResourceFilters,
  type ResourceFiltersValue,
  ResourceGrid,
} from '@hr-portal/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function ResourceCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'most_viewed' | 'most_downloaded' | 'title'>(
    'newest'
  );
  const [filters, setFilters] = useState<ResourceFiltersValue>({
    search: '',
    status: 'all',
    category: 'all',
    resourceType: 'all',
  });

  useEffect(() => {
    params.then((value) => {
      setCategory(value.category);
      setFilters((current) => ({ ...current, category: value.category }));
    });
  }, [params]);

  const { data, isLoading } = useResourceFeed({
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.resourceType !== 'all' ? { resourceType: filters.resourceType } : {}),
    ...(category ? { category } : {}),
    page: 1,
    pageSize: 50,
  });

  const resources = [...(data?.data || [])].sort((a, b) => {
    if (sortBy === 'most_viewed') return b.view_count - a.view_count;
    if (sortBy === 'most_downloaded') return b.download_count - a.download_count;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return (b.published_at || b.created_at).localeCompare(a.published_at || a.created_at);
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/information-hub" className="hover:underline">
            Information Hub
          </Link>{' '}
          / Resources / {category}
        </p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{category} Resources</h1>
      </div>

      <div className="flex items-center justify-between gap-3">
        <ResourceFilters
          value={filters}
          onChange={setFilters}
          showStatus={false}
          categories={[{ value: category, label: category }]}
        />
        <div className="flex items-center gap-2">
          <Button
            variant={sortBy === 'newest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('newest')}
          >
            Newest
          </Button>
          <Button
            variant={sortBy === 'most_viewed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('most_viewed')}
          >
            Most Viewed
          </Button>
          <Button
            variant={sortBy === 'most_downloaded' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('most_downloaded')}
          >
            Most Downloaded
          </Button>
          <Button
            variant={sortBy === 'title' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('title')}
          >
            Title
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading resources...</div>
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
              dateLabel={(resource.published_at || resource.created_at).slice(0, 10)}
              onClick={() => {
                window.location.href = `/information-hub/resources/${resource.id}`;
              }}
            />
          ))}
        </ResourceGrid>
      )}
    </div>
  );
}
