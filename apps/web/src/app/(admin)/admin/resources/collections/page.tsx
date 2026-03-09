'use client';

import { useDeleteCollection, useResourceCollections } from '@/hooks/useResourceCollections';
import { Button, Card, CardContent, Input } from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import Link from 'next/link';
import { useState } from 'react';

export default function AdminCollectionsPage() {
  const [search, setSearch] = useState('');
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
          <Button asChild variant="outline">
            <Link href="/admin/resources">Back to Resources</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/resources/collections/new">New Collection</Link>
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
          <CardContent className="p-6 text-sm text-zinc-600 dark:text-zinc-400">
            Loading collections...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-rose-600 dark:text-rose-400">
            Failed to load collections.
          </CardContent>
        </Card>
      ) : collections.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-zinc-600 dark:text-zinc-400">
            No collections found.
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
                    <Link href={`/admin/resources/collections/${collection.id}`}>Manage</Link>
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
