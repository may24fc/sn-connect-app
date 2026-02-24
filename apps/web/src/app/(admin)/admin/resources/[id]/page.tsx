'use client';

import {
  useArchiveResource,
  usePublishResource,
  useResource,
  useResourceAnalytics,
  useToggleResourceFeatured,
  useUpdateResource,
} from '@/hooks/useResources';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  ResourceAnalytics,
  ResourceTargetingSelector,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TagInput,
  Textarea,
} from '@hr-portal/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [resourceId, setResourceId] = useState('');

  useEffect(() => {
    params.then((value) => setResourceId(value.id));
  }, [params]);

  const { data, isLoading } = useResource(resourceId);
  const { data: analyticsData } = useResourceAnalytics(resourceId);
  const updateResource = useUpdateResource(resourceId);
  const publishResource = usePublishResource();
  const archiveResource = useArchiveResource();
  const toggleFeatured = useToggleResourceFeatured();

  const resource = data?.data;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<Array<string>>([]);
  const [targeting, setTargeting] = useState({
    rolesCsv: '',
    departmentsCsv: '',
    employeesCsv: '',
  });

  useEffect(() => {
    if (!resource) return;
    setTitle(resource.title);
    setDescription(resource.description || '');
    setTags(resource.tags || []);
    setTargeting({
      rolesCsv: (resource.target_roles || []).join(', '),
      departmentsCsv: (resource.target_departments || []).join(', '),
      employeesCsv: (resource.target_employees || []).join(', '),
    });
  }, [resource]);

  if (isLoading || !resource) {
    return <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading resource...</div>;
  }

  const saveDetails = async (): Promise<void> => {
    await updateResource.mutateAsync({
      title,
      description,
      tags,
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
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{resource.title}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Resource ID: {resource.id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => publishResource.mutate(resource.id)}>
            Publish
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toggleFeatured.mutate({ id: resource.id, featured: !resource.is_featured })
            }
          >
            {resource.is_featured ? 'Unfeature' : 'Feature'}
          </Button>
          <Button variant="outline" onClick={() => archiveResource.mutate(resource.id)}>
            Archive
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/resources')}>
            Back
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="targeting">Targeting</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="version">Version History</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Edit Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <TagInput value={tags} onChange={setTags} />
              <Button onClick={saveDetails} disabled={updateResource.isPending}>
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targeting">
          <Card>
            <CardHeader>
              <CardTitle>Audience Targeting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ResourceTargetingSelector value={targeting} onChange={setTargeting} />
              <Button onClick={saveDetails} disabled={updateResource.isPending}>
                Save Targeting
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <ResourceAnalytics
            viewCount={analyticsData?.data?.viewCount ?? resource.view_count}
            uniqueViewers={analyticsData?.data?.uniqueViewers ?? 0}
            downloadCount={analyticsData?.data?.downloadCount ?? resource.download_count}
            bookmarkCount={analyticsData?.data?.bookmarkCount ?? resource.bookmark_count}
            avgDurationSeconds={analyticsData?.data?.avgDurationSeconds ?? null}
            completionRate={analyticsData?.data?.completionRate ?? null}
            viewTrend={(analyticsData?.data?.timeSeries || []).map(
              (item: { date: string; views: number }) => ({
                date: item.date,
                count: item.views,
              })
            )}
          />
        </TabsContent>

        <TabsContent value="version">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <p>Current Version: v{resource.version}</p>
              <p>
                Previous Version ID:{' '}
                {resource.previous_version_id ? resource.previous_version_id : 'None'}
              </p>
              <Button variant="outline" disabled>
                Restore Previous Version
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
