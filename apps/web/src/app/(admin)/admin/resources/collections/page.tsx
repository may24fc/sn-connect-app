'use client';

import { useBackNavigation } from '@/hooks/useBackNavigation';
import { useDeleteCollection, useResourceCollections } from '@/hooks/useResourceCollections';
import { Button, Card, CardContent, EmptyState, Input } from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import Link from 'next/link';
import { AlertCircle, FolderOpen, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';

export default function AdminCollectionsPage() {
  const [search, setSearch] = useState('');
  const handleBack = useBackNavigation({ fallbackPath: '/admin/resources' });
  const { data, isLoading, error } = useResourceCollections({
    ...(search ? { search } : {}),
    page: 1,
    pageSize: 100,
  });
  const deleteCollection = useDeleteCollection();
  const { addToast } = useToast();

  const collections = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Resource Collections
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Group resources into curated learning paths
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBack}>
            Back to Resources
          </Button>
          <Button asChild>
            <Link href="/admin/resources/collections/new"><Plus className="mr-2 h-4 w-4" />New Collection</Link>
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search collections"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-md"
      />

      {isLoading ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Loader2 className="h-5 w-5 animate-spin" />}
              title="Loading collections"
              description="Resource collections are still loading."
              size="sm"
            />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={AlertCircle}
              title="Failed to load collections"
              description="Refresh and try again to load resource collections."
              size="sm"
            />
          </CardContent>
        </Card>
      ) : collections.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FolderOpen}
              title="No collections found"
              description="Create your first collection to group resources into a learning path."
              action={{ label: 'New collection', href: '/admin/resources/collections/new' }}
              size="sm"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <Card key={collection.id}>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {collection.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {collection.description || 'No description'}
                  </p>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {collection.is_public ? 'Public' : 'Targeted'}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" asChild>
                    <Link href={`/admin/resources/collections/${collection.id}`}><FolderOpen className="mr-1.5 h-3.5 w-3.5" />Manage</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteCollection.mutate(collection.id, {
                      onSuccess: () => addToast({ title: 'Collection deleted', variant: 'success' }),
                      onError: () => addToast({ title: 'Failed to delete collection', variant: 'error' }),
                    })}
                    disabled={deleteCollection.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
