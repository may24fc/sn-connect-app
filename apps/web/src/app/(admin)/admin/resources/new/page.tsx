'use client';

import { useCreateResource, useUploadResource } from '@/hooks/useResources';
import {
  Button,
  Input,
  Label,
  ResourceTargetingSelector,
  ResourceUploader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TagInput,
  Textarea,
} from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  FolderOpen,
  Globe,
  Heart,
  Image,
  Link2,
  MonitorPlay,
  Presentation,
  Send,
  Shield,
  Tag as TagIcon,
  Target,
  TrendingUp,
  Upload,
  Wrench,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const categoryOptions: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: 'onboarding', label: 'Onboarding', icon: FolderOpen },
  { value: 'training', label: 'Training', icon: BookOpen },
  { value: 'policies', label: 'Policies & Guidelines', icon: FileText },
  { value: 'benefits', label: 'Benefits', icon: Award },
  { value: 'tools', label: 'Tools & Software', icon: Wrench },
  { value: 'culture', label: 'Culture & Values', icon: Heart },
  { value: 'forms_templates', label: 'Forms & Templates', icon: FileText },
  { value: 'performance', label: 'OKRs & KPIs', icon: TrendingUp },
  { value: 'emergency', label: 'Emergency Procedures', icon: AlertTriangle },
];

const resourceTypeOptions: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'video', label: 'Video', icon: MonitorPlay },
  { value: 'presentation', label: 'Presentation', icon: Presentation },
  { value: 'link', label: 'External Link', icon: Link2 },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'interactive', label: 'Interactive', icon: Zap },
];

export default function NewResourcePage() {
  const router = useRouter();
  const uploadResource = useUploadResource();
  const createResource = useCreateResource();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('training');
  const [resourceType, setResourceType] = useState('document');
  const [externalUrl, setExternalUrl] = useState('');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileMeta, setFileMeta] = useState<{ fileSize: number; mimeType: string } | null>(null);
  const [tags, setTags] = useState<Array<string>>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [targeting, setTargeting] = useState({
    rolesCsv: '',
    departmentsCsv: '',
    employeesCsv: '',
  });
  const [showTargeting, setShowTargeting] = useState(false);
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  const handleDescriptionFocus = useCallback(() => setIsDescriptionFocused(true), []);
  const handleDescriptionBlur = useCallback(() => setIsDescriptionFocused(false), []);

  const handleFileSelected = async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const response = await uploadResource.mutateAsync(formData);
    setFilePath(response.data.filePath);
    setFileName(file.name);
    setFileMeta({ fileSize: response.data.fileSize, mimeType: response.data.mimeType });
  };

  const buildPayload = (publishImmediately: boolean) => ({
    title: title.trim() || 'Untitled',
    description,
    resourceType: resourceType as
      | 'link'
      | 'video'
      | 'document'
      | 'image'
      | 'presentation'
      | 'interactive',
    category: category as
      | 'benefits'
      | 'performance'
      | 'training'
      | 'emergency'
      | 'onboarding'
      | 'policies'
      | 'tools'
      | 'culture'
      | 'department_specific'
      | 'forms_templates',
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

  // Auto-save draft silently to prevent data loss
  const autoSaveDraft = useCallback(async (): Promise<void> => {
    if (isSavingRef.current) return;
    const hasContent = filePath || externalUrl;
    if (!hasContent) return;

    isSavingRef.current = true;
    try {
      if (createdId) {
        const res = await fetch(`/api/resources/${createdId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(false)),
        });
        if (res.ok) setLastSavedAt(new Date());
      } else {
        const response = await createResource.mutateAsync(buildPayload(false));
        setCreatedId(response.data.id);
        setLastSavedAt(new Date());
      }
    } catch {
      // Silently fail for auto-save
    } finally {
      isSavingRef.current = false;
    }
  }, [title, description, category, resourceType, tags, filePath, externalUrl, fileMeta, isPublic, targeting, createdId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save: 10 seconds after last change
  useEffect(() => {
    const hasContent = filePath || externalUrl;
    if (!hasContent || !title.trim()) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => { void autoSaveDraft(); }, 10_000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, description, category, resourceType, tags, filePath, externalUrl, fileMeta, isPublic, targeting, autoSaveDraft]);

  const create = async (publishImmediately: boolean): Promise<void> => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    try {
      let resourceId: string;

      if (createdId) {
        // Update the auto-saved draft
        const res = await fetch(`/api/resources/${createdId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(publishImmediately)),
        });
        if (!res.ok) throw new Error('Failed to update resource');
        resourceId = createdId;
      } else {
        const created = await createResource.mutateAsync(buildPayload(publishImmediately));
        resourceId = created.data.id;
      }

      if (publishImmediately) {
        await fetch(`/api/resources/${resourceId}/publish`, { method: 'POST' });
      }

      addToast({ title: publishImmediately ? 'Resource published' : 'Resource saved as draft', variant: 'success' });
      router.push(`/admin/resources/${resourceId}`);
    } catch {
      addToast({ title: 'Failed to create resource', variant: 'error' });
    }
  };

  const isExternalLink = resourceType === 'link';
  const canPublish = title && description && (filePath || externalUrl);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Action Bar */}
      <div>
        <div className="max-w p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/resources')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div className="hidden sm:block">
              <h1 className="font-heading text-lg font-semibold text-foreground tracking-tight">
                New Resource
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastSavedAt && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Auto-saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button
              variant="ghost"
              onClick={() => create(false)}
              disabled={createResource.isPending || !canPublish}
              className="border border-border text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <FileText className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            <Button
              onClick={() => create(true)}
              disabled={createResource.isPending || !canPublish}
              className="bg-primary-900 hover:bg-primary-800 text-white dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              <Send className="w-4 h-4 mr-2" />
              {createResource.isPending ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>

      {/* Split-Pane Layout */}
      <div className="p-3">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Left Column: Content Area (70%) ── */}
          <div className="flex-1 lg:w-[70%] space-y-6">
            {/* Title Input */}
            <div className="bg-card rounded-lg border border-border shadow-card px-4 py-3">
              <Input
                placeholder="Resource title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-heading font-bold border-0 bg-transparent px-0 h-auto py-2 focus-visible:ring-0 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 tracking-tight"
              />
            </div>

            {/* Description Card */}
            <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                <span className="text-xs font-medium text-muted-foreground">
                  Description
                </span>
              </div>
              <Textarea
                ref={descriptionRef}
                placeholder="What is this resource about? Who should use it?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={handleDescriptionFocus}
                onBlur={handleDescriptionBlur}
                rows={6}
                className="min-h-[180px] border-0 rounded-none resize-none focus-visible:ring-0 px-4 py-4 text-base leading-relaxed bg-card"
              />
            </div>

            {/* Upload / Link Section */}
            <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex items-center gap-2">
                {isExternalLink ? (
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="text-xs font-medium text-muted-foreground">
                  {isExternalLink ? 'External Link' : 'Upload File'}
                </span>
              </div>
              <div className="p-4">
                {isExternalLink ? (
                  <Input
                    placeholder="https://example.com/resource"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    type="url"
                  />
                ) : (
                  <div className="space-y-2">
                    <ResourceUploader
                      onFileSelected={handleFileSelected}
                      isUploading={uploadResource.isPending}
                    />
                    {fileName && (
                      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <FileText className="w-4 h-4" />
                        <span>{fileName}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(fileMeta?.fileSize ? fileMeta.fileSize / 1024 / 1024 : 0).toFixed(2)} MB)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column: Configuration Sidebar (30%) ── */}
          <div
            className={`lg:w-[30%] space-y-4 transition-opacity duration-300 ${
              isDescriptionFocused ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {/* Resource Type Card */}
            <div className="bg-card rounded-lg border border-border shadow-card p-4 space-y-3">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Resource Type
              </Label>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resourceTypeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0" />
                          {option.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Category Card */}
            <div className="bg-card rounded-lg border border-border shadow-card p-4 space-y-3">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <TagIcon className="w-3.5 h-3.5" />
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0" />
                          {option.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Tags Card */}
            <div className="bg-card rounded-lg border border-border shadow-card p-4 space-y-3">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <TagIcon className="w-3.5 h-3.5" />
                Tags
              </Label>
              <TagInput value={tags} onChange={setTags} />
              <p className="text-xs text-muted-foreground">Press Enter to add a tag</p>
            </div>

            {/* Access & Visibility Card */}
            <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
              <div className="p-4 space-y-3">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  Access
                </span>
                <button
                  type="button"
                  onClick={() => setIsPublic((v) => !v)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-sm transition-colors ${
                    isPublic
                      ? 'bg-primary-50 border-primary-200 text-primary-900 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200'
                      : 'border-border hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-muted-foreground'
                  }`}
                >
                  <Globe className={`w-4 h-4 ${isPublic ? 'text-primary-900 dark:text-zinc-300' : ''}`} />
                  <span className="flex-1 text-left">Public resource</span>
                  <div
                    className={`w-8 h-5 rounded-full transition-colors flex items-center ${
                      isPublic
                        ? 'bg-primary-900 dark:bg-zinc-400 justify-end'
                        : 'bg-zinc-200 dark:bg-zinc-700 justify-start'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white mx-0.5 shadow-sm" />
                  </div>
                </button>
              </div>

              {/* Targeting (only when not public) */}
              {!isPublic && (
                <>
                  <div className="border-t border-border">
                    <button
                      type="button"
                      onClick={() => setShowTargeting((v) => !v)}
                      className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" />
                        Who can access this?
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
                          Leave empty to make available to all employees
                        </p>
                        <ResourceTargetingSelector value={targeting} onChange={setTargeting} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
