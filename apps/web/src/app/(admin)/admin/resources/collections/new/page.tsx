'use client';

import { useCreateCollection } from '@/hooks/useResourceCollections';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from '@hr-portal/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewCollectionPage() {
  const router = useRouter();
  const createCollection = useCreateCollection();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [rolesCsv, setRolesCsv] = useState('');
  const [departmentsCsv, setDepartmentsCsv] = useState('');

  const create = async (): Promise<void> => {
    const result = await createCollection.mutateAsync({
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

    router.push(`/admin/resources/collections/${result.data.id}`);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">New Collection</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Create a collection for grouped resource delivery
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/resources/collections')}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collection Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Textarea
            placeholder="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
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
            placeholder="Target roles (comma-separated)"
            value={rolesCsv}
            onChange={(event) => setRolesCsv(event.target.value)}
            disabled={isPublic}
          />
          <Textarea
            rows={3}
            placeholder="Target departments UUIDs (comma-separated)"
            value={departmentsCsv}
            onChange={(event) => setDepartmentsCsv(event.target.value)}
            disabled={isPublic}
          />

          <div className="flex items-center gap-2">
            <Button onClick={create} disabled={createCollection.isPending || !title.trim()}>
              {createCollection.isPending ? 'Creating...' : 'Create Collection'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/resources/collections')}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}