'use client';

import { useAnnouncement } from '@/hooks/useAnnouncement';
import {
  useArchiveAnnouncement,
  usePublishAnnouncement,
  useToggleAnnouncementPin,
} from '@/hooks/usePublishAnnouncement';
import { useUpdateAnnouncement } from '@/hooks/useUpdateAnnouncement';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import {
  AnnouncementAnalyticsDashboard,
  AnnouncementEditor,
  AttachmentUploader,
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TargetingSelector,
} from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Archive, ArrowLeft, Globe, MoreHorizontal, Pencil, Pin, PinOff, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

type ViewMode = 'preview' | 'edit';

const priorityVariant: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  urgent: 'destructive',
  high: 'warning',
  normal: 'secondary',
  low: 'secondary',
};

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  expired: 'Expired',
  archived: 'Archived',
};

const categoryLabel: Record<string, string> = {
  hr_updates: 'HR Updates',
  benefits: 'Benefits',
  events: 'Events',
  performance: 'Performance',
  training: 'Training',
  policy: 'Policy',
  general: 'General',
  emergency: 'Emergency',
};

export default function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const handleBack = useBackNavigation({ fallbackPath: '/admin/announcements' });
  const [announcementId, setAnnouncementId] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>('preview');

  useEffect(() => {
    params.then((p) => setAnnouncementId(p.id));
  }, [params]);

  const { data, isLoading, error } = useAnnouncement(announcementId || '');
  const updateAnnouncement = useUpdateAnnouncement(announcementId || '');
  const publishAnnouncement = usePublishAnnouncement();
  const archiveAnnouncement = useArchiveAnnouncement();
  const pinAnnouncement = useToggleAnnouncementPin();
  const { addToast } = useToast();

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
  const remindAnnouncement = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/announcements/${announcementId}/remind`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'Failed to send reminder' }));
        throw new Error(errorBody.error || 'Failed to send reminder');
      }

      return response.json();
    },
    onSuccess: (result) => {
      const notified = result?.data?.notified ?? 0;
      addToast({
        title: notified > 0 ? 'Reminder sent' : 'No reminders sent',
        description:
          notified > 0
            ? `Notified ${notified} unread recipient${notified === 1 ? '' : 's'}.`
            : 'Everyone in the targeted audience has already read this announcement.',
        variant: 'success',
      });
      analyticsQuery.refetch();
    },
    onError: () => addToast({ title: 'Failed to send reminder', variant: 'error' }),
  });
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

  const handleSaveChanges = (): void => {
    updateAnnouncement.mutate(
      {
        title,
        content,
        excerpt: content.slice(0, 200),
      },
      {
        onSuccess: () => {
          setMode('preview');
          addToast({ title: 'Changes saved', variant: 'success' });
        },
        onError: () => addToast({ title: 'Failed to save changes', variant: 'error' }),
      }
    );
  };

  const handleSaveTargeting = (): void => {
    updateAnnouncement.mutate(
      {
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
      },
      {
        onSuccess: () => {
          setMode('preview');
          addToast({ title: 'Targeting saved', variant: 'success' });
        },
        onError: () => addToast({ title: 'Failed to save targeting', variant: 'error' }),
      }
    );
  };

  const handleBackFromEdit = (): void => {
    if (!data?.data) return;
    const item = data.data;
    setTitle(item.title);
    setContent(item.content);
    setTargeting({
      rolesCsv: item.target_roles.join(', '),
      departmentsCsv: item.target_departments.join(', '),
      employeesCsv: item.target_employees.join(', '),
    });
    setMode('preview');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="p-6 text-sm text-rose-600 dark:text-rose-400">
          Failed to load announcement.
        </div>
      </div>
    );
  }

  const announcement = data.data;

  if (mode === 'preview') {
    return (
      <div className="space-y-6">
        {/* Header with back + actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode('edit')}
            >
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white"
              onClick={() => publishAnnouncement.mutate(announcement.id, {
                onSuccess: () => addToast({ title: 'Announcement published', variant: 'success' }),
                onError: () => addToast({ title: 'Failed to publish', variant: 'error' }),
              })}
              disabled={publishAnnouncement.isPending || announcement.status === 'published'}
            >
              {publishAnnouncement.isPending ? 'Publishing...' : 'Publish'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    pinAnnouncement.mutate({ id: announcement.id, pinned: !announcement.is_pinned }, {
                      onSuccess: () => addToast({ title: announcement.is_pinned ? 'Unpinned' : 'Pinned', variant: 'success' }),
                      onError: () => addToast({ title: 'Failed to update pin', variant: 'error' }),
                    })
                  }
                  disabled={pinAnnouncement.isPending}
                >
                  {announcement.is_pinned ? (
                    <><PinOff className="mr-2 h-4 w-4" />Unpin</>
                  ) : (
                    <><Pin className="mr-2 h-4 w-4" />Pin</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => archiveAnnouncement.mutate(announcement.id, {
                    onSuccess: () => addToast({ title: 'Announcement archived', variant: 'success' }),
                    onError: () => addToast({ title: 'Failed to archive', variant: 'error' }),
                  })}
                  disabled={archiveAnnouncement.isPending}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Announcement preview */}
        <div className="bg-card border border-border rounded-lg">
          <div className="p-6 space-y-4">
            {/* Title & meta row */}
            <div className="space-y-3">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {announcement.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={priorityVariant[announcement.priority] ?? 'secondary'}>
                  {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                </Badge>
                <Badge variant="outline">
                  {statusLabel[announcement.status] ?? announcement.status}
                </Badge>
                <Badge variant="outline">
                  {categoryLabel[announcement.category] ?? announcement.category}
                </Badge>
                {announcement.is_pinned && (
                  <Badge className="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400">
                    Pinned
                  </Badge>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
              {announcement.published_at && (
                <span>Published: {new Date(announcement.published_at).toLocaleDateString()}</span>
              )}
              {announcement.expires_at && (
                <span>Expires: {new Date(announcement.expires_at).toLocaleDateString()}</span>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-zinc-200 dark:border-zinc-800" />

            {/* Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {announcement.content}
            </div>

            {/* Targeting info */}
            {(announcement.target_roles.length > 0 ||
              announcement.target_departments.length > 0 ||
              announcement.target_employees.length > 0) && (
              <>
                <div className="border-t border-zinc-200 dark:border-zinc-800" />
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Targeting
                  </h3>
                  {announcement.target_roles.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Roles:</span>
                      <div className="flex flex-wrap gap-1">
                        {announcement.target_roles.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {announcement.target_departments.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Departments:</span>
                      <div className="flex flex-wrap gap-1">
                        {announcement.target_departments.map((dept) => (
                          <Badge key={dept} variant="outline" className="text-xs">
                            {dept}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Attachments preview */}
            {(uploadAttachment.data?.data || []).length > 0 && (
              <>
                <div className="border-t border-zinc-200 dark:border-zinc-800" />
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Attachments
                  </h3>
                  <div className="space-y-1">
                    {(uploadAttachment.data?.data || []).map(
                      (attachment: { id: string; file_name: string; mime_type: string }) => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                        >
                          <span>📎</span>
                          <span>{attachment.file_name}</span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">({attachment.mime_type})</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Read stats footer */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-3 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <span>{announcement.read_count} reads</span>
            <span>Comments {announcement.allow_comments ? 'enabled' : 'disabled'}</span>
          </div>
        </div>

        {/* Analytics section */}
        <Tabs defaultValue="analytics">
          <TabsList>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="analytics" className="mt-4">
            <AnnouncementAnalyticsDashboard
              data={analyticsQuery.data?.data ?? null}
              isLoading={analyticsQuery.isLoading}
              onSendReminder={() => remindAnnouncement.mutate()}
              isReminding={remindAnnouncement.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-6">
      {/* Edit mode header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBackFromEdit}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Preview
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 text-white"
            onClick={() => publishAnnouncement.mutate(announcement.id, {
              onSuccess: () => addToast({ title: 'Announcement published', variant: 'success' }),
              onError: () => addToast({ title: 'Failed to publish', variant: 'error' }),
            })}
            disabled={publishAnnouncement.isPending || announcement.status === 'published'}
          >
            <Globe className="mr-2 h-4 w-4" />
            {publishAnnouncement.isPending ? 'Publishing...' : 'Publish'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              pinAnnouncement.mutate({ id: announcement.id, pinned: !announcement.is_pinned }, {
                onSuccess: () => addToast({ title: announcement.is_pinned ? 'Unpinned' : 'Pinned', variant: 'success' }),
                onError: () => addToast({ title: 'Failed to update pin', variant: 'error' }),
              })
            }
            disabled={pinAnnouncement.isPending}
          >
            {announcement.is_pinned ? 'Unpin' : 'Pin'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => archiveAnnouncement.mutate(announcement.id, {
              onSuccess: () => addToast({ title: 'Announcement archived', variant: 'success' }),
              onError: () => addToast({ title: 'Failed to archive', variant: 'error' }),
            })}
            disabled={archiveAnnouncement.isPending}
          >
            Archive
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="targeting">Targeting</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <AnnouncementEditor value={content} onChange={setContent} />
          <div className="flex gap-2">
            <Button
              className="bg-slate-900 hover:bg-slate-800 text-white"
              onClick={handleSaveChanges}
              disabled={updateAnnouncement.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateAnnouncement.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={handleBackFromEdit}>
              Cancel
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="targeting" className="mt-4 space-y-4">
          <TargetingSelector value={targeting} onChange={setTargeting} />
          <div className="flex gap-2">
            <Button
              className="bg-slate-900 hover:bg-slate-800 text-white"
              onClick={handleSaveTargeting}
              disabled={updateAnnouncement.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateAnnouncement.isPending ? 'Saving...' : 'Save Targeting'}
            </Button>
            <Button variant="outline" onClick={handleBackFromEdit}>
              Cancel
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="attachments" className="mt-4 space-y-4">
          <AttachmentUploader
            onFileSelected={async (file) => {
              try {
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch(`/api/announcements/${announcementId}/attachments`, {
                  method: 'POST',
                  body: formData,
                });
                if (!res.ok) throw new Error('Upload failed');
                await uploadAttachment.refetch();
                addToast({ title: 'Attachment uploaded', variant: 'success' });
              } catch {
                addToast({ title: 'Failed to upload attachment', variant: 'error' });
              }
            }}
          />
          <div className="space-y-2">
            {(uploadAttachment.data?.data || []).map(
              (attachment: { id: string; file_name: string; mime_type: string }) => (
                <Card
                  key={attachment.id}
                  className="bg-card border border-border rounded-lg p-4"
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
                      size="sm"
                      onClick={async () => {
                        try {
                          const res = await fetch(
                            `/api/announcements/${announcementId}/attachments/${attachment.id}`,
                            {
                              method: 'DELETE',
                            }
                          );
                          if (!res.ok) throw new Error('Delete failed');
                          await uploadAttachment.refetch();
                          addToast({ title: 'Attachment deleted', variant: 'success' });
                        } catch {
                          addToast({ title: 'Failed to delete attachment', variant: 'error' });
                        }
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
      </Tabs>
    </div>
  );
}
