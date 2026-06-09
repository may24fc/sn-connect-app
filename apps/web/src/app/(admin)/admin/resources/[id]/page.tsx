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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  ResourceAnalytics,
  ResourceTargetingSelector,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { Archive, ArrowLeft, Loader2, MoreHorizontal, Save, Send, Star, StarOff } from 'lucide-react';
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
  const { addToast } = useToast();

  const resource = data?.data;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targeting, setTargeting] = useState({
    rolesCsv: '',
    departmentsCsv: '',
    employeesCsv: '',
  });

  useEffect(() => {
    if (!resource) return;
    setTitle(resource.title);
    setDescription(resource.description || '');
    setTargeting({
      rolesCsv: (resource.target_roles || []).join(', '),
      departmentsCsv: (resource.target_departments || []).join(', '),
      employeesCsv: (resource.target_employees || []).join(', '),
    });
  }, [resource]);

  if (isLoading || !resource) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          title="Loading resource"
          description="Resource details are still loading."
          size="sm"
        />
      </div>
    );
  }

  const saveDetails = async (): Promise<void> => {
    try {
      await updateResource.mutateAsync({
        title,
        description,
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
      addToast({ title: 'Resource updated', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to update resource', variant: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{resource.title}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Resource ID: {resource.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/resources')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4 mr-1.5" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => publishResource.mutate(resource.id, {
                onSuccess: () => addToast({ title: 'Resource published', variant: 'success' }),
                onError: () => addToast({ title: 'Failed to publish resource', variant: 'error' }),
              })}>
                <Send className="mr-2 h-4 w-4" />
                Publish
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toggleFeatured.mutate({ id: resource.id, featured: !resource.is_featured }, {
                    onSuccess: () => addToast({ title: resource.is_featured ? 'Resource unfeatured' : 'Resource featured', variant: 'success' }),
                    onError: () => addToast({ title: 'Failed to update feature status', variant: 'error' }),
                  })
                }
              >
                {resource.is_featured ? (
                  <><StarOff className="mr-2 h-4 w-4" />Unfeature</>
                ) : (
                  <><Star className="mr-2 h-4 w-4" />Feature</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => archiveResource.mutate(resource.id, {
                onSuccess: () => {
                  addToast({ title: 'Resource archived', variant: 'success' });
                  router.push('/admin/resources');
                },
                onError: () => addToast({ title: 'Failed to archive resource', variant: 'error' }),
              })}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              <Button onClick={saveDetails} disabled={updateResource.isPending}>
                <Save className="mr-2 h-4 w-4" />
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
                <Save className="mr-2 h-4 w-4" />
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
