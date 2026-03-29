'use client';

import {
  useAddResourceToCollection,
  useCollectionResources,
  useRemoveResourceFromCollection,
  useResourceCollection,
  useUpdateCollection,
} from '@/hooks/useResourceCollections';
import { useResources } from '@/hooks/useResources';
import { formatDate } from '@/lib/format';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  ResourceCard,
  ResourceGrid,
  Textarea,
} from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Plus, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [collectionId, setCollectionId] = useState('');

  useEffect(() => {
    params.then((value) => setCollectionId(value.id));
  }, [params]);

  const { data, isLoading } = useResourceCollection(collectionId);
  const { data: collectionResourcesData, isLoading: isCollectionResourcesLoading } =
    useCollectionResources(collectionId);
  const { data: resourcesData } = useResources({ page: 1, pageSize: 100, status: 'published' });

  const updateCollection = useUpdateCollection(collectionId);
  const addResource = useAddResourceToCollection(collectionId);
  const removeResource = useRemoveResourceFromCollection(collectionId);
  const { addToast } = useToast();

  const collection = data?.data;
  const collectionResources = collectionResourcesData?.data || [];
  const resources = resourcesData?.data || [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [rolesCsv, setRolesCsv] = useState('');
  const [departmentsCsv, setDepartmentsCsv] = useState('');

  useEffect(() => {
    if (!collection) return;
    setTitle(collection.title);
    setDescription(collection.description || '');
    setIsPublic(collection.is_public);
    setRolesCsv((collection.target_roles || []).join(', '));
    setDepartmentsCsv((collection.target_departments || []).join(', '));
  }, [collection]);

  const memberIds = useMemo(
    () => new Set(collectionResources.map((item) => item.id)),
    [collectionResources]
  );

  const save = async (): Promise<void> => {
    try {
      await updateCollection.mutateAsync({
        title,
        description: description || null,
        isPublic,
        targetRoles: rolesCsv
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        targetDepartments: departmentsCsv
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      });
      addToast({ title: 'Collection updated', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to update collection', variant: 'error' });
    }
  };

  if (isLoading || !collection) {
    return <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading collection...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{collection.title}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Collection ID: {collection.id}</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/resources/collections')}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collection Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
          />
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
            />
            Public collection
          </label>
          <Input
            value={rolesCsv}
            onChange={(event) => setRolesCsv(event.target.value)}
            placeholder="Target roles (comma-separated)"
            disabled={isPublic}
          />
          <Textarea
            rows={2}
            value={departmentsCsv}
            onChange={(event) => setDepartmentsCsv(event.target.value)}
            placeholder="Target departments UUIDs (comma-separated)"
            disabled={isPublic}
          />
          <Button onClick={save} disabled={updateCollection.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Collection Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCollectionResourcesLoading ? (
            <EmptyState
              icon={<Loader2 className="h-5 w-5 animate-spin" />}
              title="Loading collection resources"
              description="Collection resources are still loading."
              size="sm"
            />
          ) : collectionResources.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No resources in this collection yet"
              description="Add published resources to start building this collection."
              size="sm"
            />
          ) : (
            <ResourceGrid
              columns={4}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {collectionResources.map((resource) => (
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
                    dateLabel={formatDate(resource.published_at || resource.created_at)}
                    onClick={() => {
                      router.push(`/admin/resources/${resource.id}`);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeResource.mutate(resource.id, {
                      onSuccess: () => addToast({ title: 'Resource removed from collection', variant: 'success' }),
                      onError: () => addToast({ title: 'Failed to remove resource', variant: 'error' }),
                    })}
                    disabled={removeResource.isPending}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </ResourceGrid>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <ResourceGrid
            columns={4}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {resources
              .filter((resource) => !memberIds.has(resource.id))
              .map((resource) => (
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
                    dateLabel={formatDate(resource.published_at || resource.created_at)}
                    onClick={() => {
                      router.push(`/admin/resources/${resource.id}`);
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() =>
                      addResource.mutate({
                        resourceId: resource.id,
                        displayOrder: collectionResources.length,
                      }, {
                        onSuccess: () => addToast({ title: 'Resource added to collection', variant: 'success' }),
                        onError: () => addToast({ title: 'Failed to add resource', variant: 'error' }),
                      })
                    }
                    disabled={addResource.isPending}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add to Collection
                  </Button>
                </div>
              ))}
          </ResourceGrid>
        </CardContent>
      </Card>
    </div>
  );
}
