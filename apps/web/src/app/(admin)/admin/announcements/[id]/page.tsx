'use client';

import { useAnnouncement } from '@/hooks/useAnnouncement';
import {
  useArchiveAnnouncement,
  usePublishAnnouncement,
  useToggleAnnouncementPin,
} from '@/hooks/usePublishAnnouncement';
import { useUpdateAnnouncement } from '@/hooks/useUpdateAnnouncement';
import {
  AnnouncementAnalytics,
  AnnouncementEditor,
  AttachmentUploader,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TargetingSelector,
} from '@hr-portal/ui';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export default function AnnouncementDetailPage({ params }: { params: { id: string } }) {
  const announcementId = params.id;
  const { data, isLoading, error } = useAnnouncement(announcementId);
  const updateAnnouncement = useUpdateAnnouncement(announcementId);
  const publishAnnouncement = usePublishAnnouncement();
  const archiveAnnouncement = useArchiveAnnouncement();
  const pinAnnouncement = useToggleAnnouncementPin();

  const analyticsQuery = useQuery({
    queryKey: ['announcements', 'analytics', announcementId],
    queryFn: async () => {
      const response = await fetch(`/api/announcements/${announcementId}/analytics`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    enabled: !!announcementId,
  });

  const uploadAttachment = useQuery({
    queryKey: ['announcements', 'attachments', announcementId],
    queryFn: async () => {
      const response = await fetch(`/api/announcements/${announcementId}/attachments`);
      if (!response.ok) throw new Error('Failed to fetch attachments');
      return response.json();
    },
    enabled: !!announcementId,
  });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targeting, setTargeting] = useState({
    rolesCsv: '',
    departmentsCsv: '',
    employeesCsv: '',
  });

  useEffect(() => {
    if (!data?.data) return;
    const item = data.data;
    setTitle(item.title);
    setContent(item.content);
    setTargeting({
      rolesCsv: item.target_roles.join(', '),
      departmentsCsv: item.target_departments.join(', '),
      employeesCsv: item.target_employees.join(', '),
    });
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-zinc-600 dark:text-zinc-400">Loading announcement...</div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="p-6 text-sm text-rose-600 dark:text-rose-400">
        Failed to load announcement.
      </div>
    );
  }

  const announcement = data.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {announcement.title}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Manage details, targeting, attachments, and analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => publishAnnouncement.mutate(announcement.id)}>
            Publish
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              pinAnnouncement.mutate({ id: announcement.id, pinned: !announcement.is_pinned })
            }
          >
            {announcement.is_pinned ? 'Unpin' : 'Pin'}
          </Button>
          <Button variant="outline" onClick={() => archiveAnnouncement.mutate(announcement.id)}>
            Archive
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="targeting">Targeting</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <AnnouncementEditor value={content} onChange={setContent} />
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
            onClick={() =>
              updateAnnouncement.mutate({
                title,
                content,
                excerpt: content.slice(0, 200),
              })
            }
          >
            Save Changes
          </Button>
        </TabsContent>

        <TabsContent value="targeting" className="mt-4 space-y-4">
          <TargetingSelector value={targeting} onChange={setTargeting} />
          <Button
            onClick={() =>
              updateAnnouncement.mutate({
                targetRoles: targeting.rolesCsv
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
                targetDepartments: targeting.departmentsCsv
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
                targetEmployees: targeting.employeesCsv
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          >
            Save Targeting
          </Button>
        </TabsContent>

        <TabsContent value="attachments" className="mt-4 space-y-4">
          <AttachmentUploader
            onFileSelected={async (file) => {
              const formData = new FormData();
              formData.append('file', file);
              await fetch(`/api/announcements/${announcementId}/attachments`, {
                method: 'POST',
                body: formData,
              });
              await uploadAttachment.refetch();
            }}
          />
          <div className="space-y-2">
            {(uploadAttachment.data?.data || []).map(
              (attachment: { id: string; file_name: string; mime_type: string }) => (
                <Card
                  key={attachment.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
                >
                  <CardContent className="p-0 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {attachment.mime_type}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await fetch(
                          `/api/announcements/${announcementId}/attachments/${attachment.id}`,
                          {
                            method: 'DELETE',
                          }
                        );
                        await uploadAttachment.refetch();
                      }}
                    >
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <AnnouncementAnalytics
            readCount={analyticsQuery.data?.data?.readCount || 0}
            uniqueReaders={analyticsQuery.data?.data?.uniqueReaders || 0}
            timeSeries={analyticsQuery.data?.data?.timeSeries || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
