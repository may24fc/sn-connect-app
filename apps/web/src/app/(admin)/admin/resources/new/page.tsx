'use client';

import { useCreateResource, useUploadResource } from '@/hooks/useResources';
import {
  Button,
  Input,
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
  MousePointer,
  Presentation,
  Send,
  Tag as TagIcon,
  Target,
  TrendingUp,
  Upload,
  Wrench,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const categoryOptions: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: 'onboarding', label: 'Onboarding', icon: FolderOpen },
  { value: 'training', label: 'Training', icon: BookOpen },
  { value: 'policies', label: 'Policies & Guidelines', icon: FileText },
  { value: 'benefits', label: 'Benefits', icon: Award },
  { value: 'tools', label: 'Tools & Software', icon: Wrench },
  { value: 'culture', label: 'Culture & Values', icon: Heart },
  { value: 'forms_templates', label: 'Forms & Templates', icon: FileText },
  { value: 'performance', label: 'Performance', icon: TrendingUp },
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

  const handleFileSelected = async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const response = await uploadResource.mutateAsync(formData);
    setFilePath(response.data.filePath);
    setFileName(file.name);
    setFileMeta({ fileSize: response.data.fileSize, mimeType: response.data.mimeType });
  };

  const create = async (publishImmediately: boolean): Promise<void> => {
    const created = await createResource.mutateAsync({
      title,
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

    if (publishImmediately) {
      await fetch(`/api/resources/${created.data.id}/publish`, { method: 'POST' });
    }

    router.push(`/admin/resources/${created.data.id}`);
  };

  const isExternalLink = resourceType === 'link';
  const canPublish = title && description && (filePath || externalUrl);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/resources')}
              className="text-zinc-500 dark:text-zinc-400"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                New Resource
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Share documents, videos, and links</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => create(false)}
              disabled={createResource.isPending || !canPublish}
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => create(true)}
              disabled={createResource.isPending || !canPublish}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {createResource.isPending ? 'Publishing...' : 'Publish'}
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
              placeholder="Resource title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-semibold border-0 px-0 focus-visible:ring-0 placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
            />
            <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Description
            </label>
            <Textarea
              placeholder="What is this resource about? Who should use it?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Resource Type & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <FileText className="w-4 h-4" />
                Resource Type
              </label>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <TagIcon className="w-4 h-4" />
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
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
          </div>

          {/* Content Upload or Link */}
          <div className="space-y-3 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-card">
            <div className="flex items-center gap-2 mb-2">
              {isExternalLink ? (
                <Link2 className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              ) : (
                <Upload className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              )}
              <h3 className="text-sm font-medium">
                {isExternalLink ? 'External Link' : 'Upload File'}
              </h3>
            </div>

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
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      ({(fileMeta?.fileSize ? fileMeta.fileSize / 1024 / 1024 : 0).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <TagIcon className="w-4 h-4" />
              Tags (Optional)
            </label>
            <TagInput value={tags} onChange={setTags} />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Add tags to help people find this resource (press Enter to add)
            </p>
          </div>

          {/* Public Access */}
          <div className="flex items-center gap-3 py-4 border-y border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsPublic((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
                isPublic
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800'
                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm">Public resource (visible to everyone)</span>
            </button>
          </div>

          {/* Targeting */}
          {!isPublic && (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <button
                type="button"
                onClick={() => setShowTargeting((v) => !v)}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  <span className="text-sm font-medium">Who can access this? (Optional)</span>
                </div>
                {showTargeting ? (
                  <ChevronUp className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                )}
              </button>
              {showTargeting && (
                <div className="p-4 pt-0 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                    Leave empty to make available to all employees
                  </p>
                  <ResourceTargetingSelector value={targeting} onChange={setTargeting} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
