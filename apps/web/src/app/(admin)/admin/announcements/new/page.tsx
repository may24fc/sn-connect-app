'use client';

import { useCreateAnnouncement } from '@/hooks/useCreateAnnouncement';
import { useUploadAnnouncementAttachment } from '@/hooks/useUploadAnnouncementAttachment';
import {
  AnnouncementEditor,
  AnnouncementPreview,
  AttachmentUploader,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TargetingSelector,
} from '@hr-portal/ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

function parseCsvList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function NewAnnouncementPage() {
  const router = useRouter();
  const createAnnouncement = useCreateAnnouncement();
  const [createdId, setCreatedId] = useState<string | null>(null);
  const uploadAttachment = useUploadAnnouncementAttachment(createdId || '');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<
    | 'hr_updates'
    | 'benefits'
    | 'events'
    | 'performance'
    | 'training'
    | 'policy'
    | 'general'
    | 'emergency'
  >('general');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [status, setStatus] = useState<
    'draft' | 'scheduled' | 'published' | 'expired' | 'archived'
  >('draft');
  const [publishedAt, setPublishedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [allowComments, setAllowComments] = useState(false);
  const [targeting, setTargeting] = useState({
    rolesCsv: '',
    departmentsCsv: '',
    employeesCsv: '',
  });

  const excerpt = useMemo(() => content.slice(0, 200), [content]);

  const save = async (nextStatus: 'draft' | 'scheduled' | 'published' | 'expired' | 'archived') => {
    try {
      const response = await createAnnouncement.mutateAsync({
        title,
        content,
        excerpt,
        category,
        priority,
        status: nextStatus,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        targetRoles: parseCsvList(targeting.rolesCsv),
        targetDepartments: parseCsvList(targeting.departmentsCsv),
        targetEmployees: parseCsvList(targeting.employeesCsv),
        isPinned,
        allowComments,
      });

      setCreatedId(response.data.id);
      
      // Redirect to announcements list after successful creation
      router.push('/admin/announcements');
    } catch (error) {
      // Error is already logged by the mutation hook
      console.error('Failed to save announcement:', error);
    }
  };

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex overflow-hidden">
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-y-auto">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Steps</p>
        <ol className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li>1. Basic Info</li>
          <li>2. Targeting</li>
          <li>3. Attachments</li>
          <li>4. Preview</li>
          <li>5. Publish</li>
        </ol>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-2">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            New Announcement
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <Tabs defaultValue="basic">
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="targeting">Targeting</TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={category}
                    onValueChange={(value) =>
                      setCategory(
                        value as
                          | 'hr_updates'
                          | 'benefits'
                          | 'events'
                          | 'performance'
                          | 'training'
                          | 'policy'
                          | 'general'
                          | 'emergency'
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'hr_updates',
                        'benefits',
                        'events',
                        'performance',
                        'training',
                        'policy',
                        'general',
                        'emergency',
                      ].map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(value) =>
                      setPriority(value as 'low' | 'normal' | 'high' | 'urgent')
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['low', 'normal', 'high', 'urgent'].map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) =>
                      setStatus(
                        value as 'draft' | 'scheduled' | 'published' | 'expired' | 'archived'
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['draft', 'scheduled', 'published', 'expired', 'archived'].map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Publish At</Label>
                  <Input
                    type="datetime-local"
                    value={publishedAt}
                    onChange={(event) => setPublishedAt(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expires At</Label>
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant={isPinned ? 'default' : 'outline'}
                  onClick={() => setIsPinned((v) => !v)}
                >
                  {isPinned ? 'Pinned' : 'Pin'}
                </Button>
                <Button
                  type="button"
                  variant={allowComments ? 'default' : 'outline'}
                  onClick={() => setAllowComments((v) => !v)}
                >
                  {allowComments ? 'Comments Enabled' : 'Enable Comments'}
                </Button>
              </div>

              <AnnouncementEditor value={content} onChange={setContent} />
            </TabsContent>

            <TabsContent value="targeting" className="mt-4">
              <TargetingSelector value={targeting} onChange={setTargeting} />
            </TabsContent>

            <TabsContent value="attachments" className="mt-4 space-y-3">
              <AttachmentUploader
                onFileSelected={(file) => {
                  if (!createdId) return;
                  uploadAttachment.mutate(file);
                }}
                isUploading={uploadAttachment.isPending}
              />
              {!createdId ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Save draft first to enable uploads.
                </p>
              ) : null}
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <AnnouncementPreview
                title={title}
                excerpt={excerpt}
                category={category}
                priority={priority}
                status={status}
                isPinned={isPinned}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/announcements')}
            className="border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 px-4 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => save('draft')}
              disabled={createAnnouncement.isPending}
            >
              Save Draft
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
              onClick={() => save(status === 'draft' ? 'published' : status)}
              disabled={createAnnouncement.isPending}
            >
              {status === 'draft' ? 'Publish' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
