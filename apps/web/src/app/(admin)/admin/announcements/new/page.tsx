'use client';

import { useCreateAnnouncement } from '@/hooks/useCreateAnnouncement';
import { useUploadAnnouncementAttachment } from '@/hooks/useUploadAnnouncementAttachment';
import {
  AnnouncementEditor,
  AttachmentUploader,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TargetingSelector,
  useToast,
} from '@hr-portal/ui';
import { 
  AlertCircle, 
  Calendar, 
  FileText, 
  MessageSquare, 
  Pin, 
  Send, 
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

function parseCsvList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const categoryOptions = [
  { value: 'general', label: 'General Update', icon: '📢' },
  { value: 'hr_updates', label: 'HR Updates', icon: '👥' },
  { value: 'benefits', label: 'Benefits', icon: '🎁' },
  { value: 'events', label: 'Events', icon: '🎉' },
  { value: 'training', label: 'Training', icon: '📚' },
  { value: 'policy', label: 'Policy', icon: '📋' },
  { value: 'emergency', label: 'Emergency', icon: '🚨' },
];

const priorityOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High Priority' },
  { value: 'urgent', label: 'Urgent' },
];

export default function NewAnnouncementPage() {
  const router = useRouter();
  const createAnnouncement = useCreateAnnouncement();
  const { addToast } = useToast();
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
  const [publishedAt, setPublishedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [targeting, setTargeting] = useState({
    rolesCsv: '',
    departmentsCsv: '',
    employeesCsv: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTargeting, setShowTargeting] = useState(false);

  const excerpt = useMemo(() => content.slice(0, 200), [content]);

  const save = async (nextStatus: 'draft' | 'published') => {
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
        targetRoles: parseCsvList(targeting.rolesCsv) as ('employee' | 'intern' | 'admin' | 'super_admin')[],
        targetDepartments: parseCsvList(targeting.departmentsCsv),
        targetEmployees: parseCsvList(targeting.employeesCsv),
        isPinned,
        allowComments,
      });

      addToast({
        title: nextStatus === 'published' ? 'Announcement published' : 'Draft saved',
        description: nextStatus === 'published' ? 'Announcement is now visible to selected audience' : 'You can continue editing later',
        variant: 'success',
      });

      setCreatedId(response.data.id);
      router.push('/admin/announcements');
    } catch (error) {
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save announcement',
        variant: 'error',
      });
      console.error('Failed to save announcement:', error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/announcements')}
              className="text-zinc-500"
            >
              ← Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                New Announcement
              </h1>
              <p className="text-sm text-zinc-500">Share updates with your team</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => save('draft')}
              disabled={createAnnouncement.isPending || !title || !content}
            >
              Save Draft
            </Button>
            <Button
              onClick={() => save('published')}
              disabled={createAnnouncement.isPending || !title || !content}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Title */}
          <div className="space-y-2">
            <Input
              placeholder="Announcement title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-semibold border-0 px-0 focus-visible:ring-0 placeholder:text-zinc-300"
            />
            <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          {/* Quick Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Category
              </Label>
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
                  {categoryOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      <span className="flex items-center gap-2">
                        <span>{item.icon}</span>
                        {item.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Priority
              </Label>
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
                  {priorityOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Message</Label>
            <AnnouncementEditor value={content} onChange={setContent} />
          </div>

          {/* Attachments */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Attachments (Optional)</Label>
            <AttachmentUploader
              onFileSelected={(file) => {
                if (!createdId) return;
                uploadAttachment.mutate(file);
              }}
              isUploading={uploadAttachment.isPending}
            />
            {!createdId && (
              <p className="text-xs text-zinc-500">
                💡 Save as draft first to attach files
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 py-4 border-y border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsPinned((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
                isPinned
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800'
                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              <Pin className="w-4 h-4" />
              <span className="text-sm">Pin to top</span>
            </button>
            <button
              type="button"
              onClick={() => setAllowComments((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
                allowComments
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800'
                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">Allow comments</span>
            </button>
          </div>

          {/* Targeting Section */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => setShowTargeting((v) => !v)}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium">Who can see this? (Optional)</span>
              </div>
              {showTargeting ? (
                <ChevronUp className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </button>
            {showTargeting && (
              <div className="p-4 pt-0 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 mb-3">
                  Leave empty to show to everyone
                </p>
                <TargetingSelector value={targeting} onChange={setTargeting} />
              </div>
            )}
          </div>

          {/* Advanced Options */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium">Schedule & Expiry (Optional)</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </button>
            {showAdvanced && (
              <div className="p-4 pt-0 border-t border-zinc-200 dark:border-zinc-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Publish Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={publishedAt}
                      onChange={(e) => setPublishedAt(e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-zinc-500">Leave empty to publish now</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Expiry Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-zinc-500">
                      Leave empty to never expire
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
