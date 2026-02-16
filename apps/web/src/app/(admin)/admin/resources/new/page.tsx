'use client';

import { useCreateResource, useUploadResource } from '@/hooks/useResources';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  ResourceTargetingSelector,
  ResourceUploader,
  TagInput,
  Textarea,
} from '@hr-portal/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const categories = [
  'onboarding',
  'training',
  'policies',
  'benefits',
  'tools',
  'culture',
  'department_specific',
  'forms_templates',
  'performance',
  'emergency',
] as const;

const resourceTypes = ['video', 'document', 'image', 'link', 'presentation', 'interactive'] as const;

export default function NewResourcePage() {
  const router = useRouter();
  const uploadResource = useUploadResource();
  const createResource = useCreateResource();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('training');
  const [resourceType, setResourceType] = useState<(typeof resourceTypes)[number]>('document');
  const [externalUrl, setExternalUrl] = useState('');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ fileSize: number; mimeType: string } | null>(null);
  const [tags, setTags] = useState<Array<string>>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [targeting, setTargeting] = useState({
    rolesCsv: '',
    departmentsCsv: '',
    employeesCsv: '',
  });

  const handleFileSelected = async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const response = await uploadResource.mutateAsync(formData);
    setFilePath(response.data.filePath);
    setFileMeta({ fileSize: response.data.fileSize, mimeType: response.data.mimeType });
  };

  const create = async (publishImmediately: boolean): Promise<void> => {
    const created = await createResource.mutateAsync({
      title,
      description,
      resourceType,
      category,
      tags,
      filePath: filePath || undefined,
      externalUrl: externalUrl || undefined,
      fileSize: fileMeta?.fileSize,
      mimeType: fileMeta?.mimeType,
      isPublic,
      targetRoles: targeting.rolesCsv
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      targetDepartments: targeting.departmentsCsv
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      targetEmployees: targeting.employeesCsv
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      publishedAt: publishImmediately ? new Date().toISOString() : undefined,
      isFeatured: false,
      isPinned: false,
      displayOrder: 0,
    });

    if (publishImmediately) {
      await fetch(`/api/resources/${created.data.id}/publish`, { method: 'POST' });
    }

    router.push(`/admin/resources/${created.data.id}`);
  };

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex overflow-hidden">
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-y-auto">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Create Resource</h2>
        <ol className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li>1. Basic Info</li>
          <li>2. Content Upload/Link</li>
          <li>3. Targeting</li>
          <li>4. Publish</li>
        </ol>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/resources')}>
            Back
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
              <Textarea
                placeholder="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  className="border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-900"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}
                >
                  {categories.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <select
                  className="border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-900"
                  value={resourceType}
                  onChange={(event) => setResourceType(event.target.value as (typeof resourceTypes)[number])}
                >
                  {resourceTypes.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <TagInput value={tags} onChange={setTags} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ResourceUploader onFileSelected={handleFileSelected} isUploading={uploadResource.isPending} />
              <Input
                placeholder="or external URL"
                value={externalUrl}
                onChange={(event) => setExternalUrl(event.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Targeting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(event) => setIsPublic(event.target.checked)}
                />
                Public resource (visible to all)
              </label>
              <ResourceTargetingSelector value={targeting} onChange={setTargeting} />
            </CardContent>
          </Card>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push('/admin/resources')}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => create(false)} disabled={createResource.isPending}>
              Save as Draft
            </Button>
            <Button onClick={() => create(true)} disabled={createResource.isPending}>
              Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
