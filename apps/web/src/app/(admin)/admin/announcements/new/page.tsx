'use client';

import { useCreateAnnouncement } from '@/hooks/useCreateAnnouncement';
import { useUploadAnnouncementAttachment } from '@/hooks/useUploadAnnouncementAttachment';
import {
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
  Textarea,
  useToast,
} from '@hr-portal/ui';
import {
  AlertCircle,
  ArrowLeft,
  Bold,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  MessageSquare,
  Paperclip,
  Pin,
  Send,
  Target,
  Underline,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function parseCsvList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const categoryOptions = [
  { value: 'general', label: 'General Update' },
  { value: 'hr_updates', label: 'HR Updates' },
  { value: 'benefits', label: 'Benefits' },
  { value: 'events', label: 'Events' },
  { value: 'training', label: 'Training' },
  { value: 'policy', label: 'Policy' },
  { value: 'emergency', label: 'Emergency' },
];

const priorityOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High Priority' },
  { value: 'urgent', label: 'Urgent' },
];

const toolbarButtons = [
  { icon: Bold, label: 'Bold' },
  { icon: Italic, label: 'Italic' },
  { icon: Underline, label: 'Underline' },
  { icon: Heading2, label: 'Heading' },
  { icon: List, label: 'Bullet List' },
  { icon: ListOrdered, label: 'Numbered List' },
  { icon: Link2, label: 'Insert Link' },
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
  const [showSchedule, setShowSchedule] = useState(false);
  const [showTargeting, setShowTargeting] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const excerpt = useMemo(() => content.slice(0, 200), [content]);

  // When a draft is auto-created to enable attachment upload, fire the pending upload
  useEffect(() => {
    if (pendingFile && createdId) {
      uploadAttachment.mutate(pendingFile);
      setPendingFile(null);
    }
  }, [createdId, pendingFile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditorFocus = useCallback(() => setIsEditorFocused(true), []);
  const handleEditorBlur = useCallback(() => setIsEditorFocused(false), []);

  const save = async (nextStatus: 'draft' | 'published') => {
    try {
      const payload = {
        title,
        content,
        excerpt,
        category,
        priority,
        status: nextStatus,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        targetRoles: parseCsvList(targeting.rolesCsv) as (
          | 'employee'
          | 'associate'
          | 'admin'
          | 'super_admin'
        )[],
        targetDepartments: parseCsvList(targeting.departmentsCsv),
        targetEmployees: parseCsvList(targeting.employeesCsv),
        isPinned,
        allowComments,
      };

      if (createdId) {
        // Update the auto-saved draft instead of creating a duplicate
        const res = await fetch(`/api/announcements/${createdId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update announcement');
      } else {
        const response = await createAnnouncement.mutateAsync(payload);
        setCreatedId(response.data.id);
      }

      addToast({
        title: nextStatus === 'published' ? 'Announcement published' : 'Draft saved',
        description:
          nextStatus === 'published'
            ? 'Announcement is now visible to selected audience'
            : 'You can continue editing later',
        variant: 'success',
      });

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

  // Auto-saves a draft silently (no redirect) so attachments can be uploaded immediately
  const autoSaveDraft = async (): Promise<void> => {
    try {
      const response = await createAnnouncement.mutateAsync({
        title: title.trim() || 'Untitled',
        content,
        excerpt,
        category,
        priority,
        status: 'draft',
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        targetRoles: parseCsvList(targeting.rolesCsv) as (
          | 'employee'
          | 'associate'
          | 'admin'
          | 'super_admin'
        )[],
        targetDepartments: parseCsvList(targeting.departmentsCsv),
        targetEmployees: parseCsvList(targeting.employeesCsv),
        isPinned,
        allowComments,
      });
      setCreatedId(response.data.id);
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Could not prepare attachment upload',
        variant: 'error',
      });
      console.error('Auto-save draft failed:', error);
    }
  };

  const handleFileSelected = async (file: File): Promise<void> => {
    if (createdId) {
      uploadAttachment.mutate(file);
    } else {
      // Store file; useEffect will upload it once createdId is set
      setPendingFile(file);
      await autoSaveDraft();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Action Bar */}
      <div className="backdrop-blur-sm">
        <div className="max-w p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/announcements')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div className="hidden sm:block">
              <h1 className="font-heading text-lg font-semibold text-foreground tracking-tight">
                New Announcement
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => save('draft')}
              disabled={createAnnouncement.isPending || !title || !content}
              className="border border-border text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <FileText className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button
              onClick={() => save('published')}
              disabled={createAnnouncement.isPending || !title || !content}
              className="bg-primary-900 hover:bg-primary-800 text-white dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              <Send className="w-4 h-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>
      </div>

      {/* Split-Pane Layout */}
      <div className="max-w p-3">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Left Column: Writing Area (70%) ── */}
          <div className="flex-1 lg:w-[70%] space-y-6">
            {/* Title Input */}
            <div className="bg-card rounded-lg border border-border shadow-card px-4 py-3">
              <Input
                placeholder="Announcement title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-heading font-bold border-0 bg-transparent px-0 h-auto py-2 focus-visible:ring-0 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 tracking-tight"
              />
            </div>

            {/* Message Editor Card */}
            <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
              {/* Rich Text Toolbar */}
              <div className="flex items-center gap-0.5 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                {toolbarButtons.map((btn) => {
                  const Icon = btn.icon;
                  return (
                    <button
                      key={btn.label}
                      type="button"
                      title={btn.label}
                      className="p-2 rounded-md text-zinc-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      onClick={() => editorRef.current?.focus()}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
                <div className="mx-2 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
                <button
                  type="button"
                  title="Attach file"
                  className="p-2 rounded-md text-zinc-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>

              {/* Editor Area */}
              <Textarea
                ref={editorRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={handleEditorFocus}
                onBlur={handleEditorBlur}
                placeholder="Write your announcement..."
                className="min-h-[380px] border-0 rounded-none resize-none focus-visible:ring-0 px-4 py-4 text-base leading-relaxed bg-card"
              />

              {/* Compact Dropzone */}
              <div className="border-t border-dashed border-zinc-200 dark:border-zinc-700 px-4 py-3 bg-zinc-50/30 dark:bg-zinc-900/30">
                <AttachmentUploader
                  onFileSelected={handleFileSelected}
                  isUploading={uploadAttachment.isPending || (createAnnouncement.isPending && pendingFile !== null)}
                />
              </div>
            </div>
          </div>

          {/* ── Right Column: Configuration Sidebar (30%) ── */}
          <div
            className={`lg:w-[30%] space-y-4 transition-opacity duration-300 ${
              isEditorFocused ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {/* Category Card */}
            <div className="bg-card rounded-lg border border-border shadow-card p-4 space-y-3">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
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
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Card */}
            <div className="bg-card rounded-lg border border-border shadow-card p-4 space-y-3">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                Priority
              </Label>
              <Select
                value={priority}
                onValueChange={(value) =>
                  setPriority(value as 'low' | 'normal' | 'high' | 'urgent')
                }
              >
                <SelectTrigger className="w-full">
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

            {/* Targeting Card */}
            <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTargeting((v) => !v)}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="w-3.5 h-3.5" />
                  Who can see this?
                </span>
                {showTargeting ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {showTargeting && (
                <div className="px-4 pb-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mt-3 mb-3">
                    Leave empty to show to everyone
                  </p>
                  <TargetingSelector value={targeting} onChange={setTargeting} />
                </div>
              )}
            </div>

            {/* Schedule & Expiry Card */}
            <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSchedule((v) => !v)}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Schedule & Expiry
                </span>
                {showSchedule ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {showSchedule && (
                <div className="px-4 pb-4 border-t border-border space-y-4 pt-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Publish Date</Label>
                    <Input
                      type="datetime-local"
                      value={publishedAt}
                      onChange={(e) => setPublishedAt(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                    <Input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Options Card */}
            <div className="bg-card rounded-lg border border-border shadow-card p-4 space-y-3">
              <span className="text-xs font-medium text-muted-foreground block">
                Options
              </span>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsPinned((v) => !v)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-sm transition-colors ${
                    isPinned
                      ? 'bg-primary-50 border-primary-200 text-primary-900 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200'
                      : 'border-border hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-muted-foreground'
                  }`}
                >
                  <Pin className={`w-4 h-4 ${isPinned ? 'text-primary-900 dark:text-zinc-300' : ''}`} />
                  <span className="flex-1 text-left">Pin to top</span>
                  <div
                    className={`w-8 h-5 rounded-full transition-colors flex items-center ${
                      isPinned
                        ? 'bg-primary-900 dark:bg-zinc-400 justify-end'
                        : 'bg-zinc-200 dark:bg-zinc-700 justify-start'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white mx-0.5 shadow-sm" />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAllowComments((v) => !v)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-sm transition-colors ${
                    allowComments
                      ? 'bg-primary-50 border-primary-200 text-primary-900 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200'
                      : 'border-border hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-muted-foreground'
                  }`}
                >
                  <MessageSquare
                    className={`w-4 h-4 ${allowComments ? 'text-primary-900 dark:text-zinc-300' : ''}`}
                  />
                  <span className="flex-1 text-left">Allow comments</span>
                  <div
                    className={`w-8 h-5 rounded-full transition-colors flex items-center ${
                      allowComments
                        ? 'bg-primary-900 dark:bg-zinc-400 justify-end'
                        : 'bg-zinc-200 dark:bg-zinc-700 justify-start'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white mx-0.5 shadow-sm" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
