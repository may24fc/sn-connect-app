'use client';

import { useCreateResource, useUploadResource } from '@/hooks/useResources';
import type { CreateResourceInput } from '@/lib/schemas/resource.schema';
import { Button, Input, ResourceTargetingSelector, ResourceUploader, Textarea, useToast } from '@hr-portal/ui';
import { ArrowLeft, FileText, Link2, Send, Upload, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';

// Resource Type / Category removed from UI — defaults applied in payload

export default function EmployeeNewResourcePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = searchParams?.get('folderId') || undefined;
  const uploadResource = useUploadResource();
  const createResource = useCreateResource();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileMeta, setFileMeta] = useState<{ fileSize: number; mimeType: string } | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [targeting, setTargeting] = useState({ rolesCsv: '', departmentsCsv: '', employeesCsv: '' });
  const [showTargeting, setShowTargeting] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const handleFileSelected = async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await uploadResource.mutateAsync(formData);
    setFilePath(response.data.filePath);
    setFileName(file.name);
    setFileMeta({ fileSize: response.data.fileSize, mimeType: response.data.mimeType });
  };

  const buildPayload = (): CreateResourceInput => ({
    title: title.trim() || 'Untitled',
    description,
    folderId: folderId || undefined,
    filePath: filePath || undefined,
      externalUrl: externalUrl.trim() || undefined,
    fileSize: fileMeta?.fileSize,
    mimeType: fileMeta?.mimeType,
    isPublic,
    isFeatured: false,
    isPinned: false,
    displayOrder: 0,
    targetRoles: targeting.rolesCsv
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
    targetDepartments: targeting.departmentsCsv
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
    targetEmployees: targeting.employeesCsv
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  });

  const submit = async (): Promise<void> => {
    try {
      await createResource.mutateAsync(buildPayload());
      addToast({ title: 'Submitted for approval', variant: 'success' });
      // Pending resources are not always viewable from detail routes for non-admin users.
      // Redirect users to the originating list page to avoid indefinite loading states.
      if (folderId) {
        router.push(`/information-hub/resources/folder/${folderId}`);
      } else {
        router.push('/information-hub');
      }
    } catch (err) {
      addToast({ title: 'Failed to submit resource', variant: 'error' });
    }
  };

  const hasExternalUrl = Boolean(externalUrl.trim());
  const canSubmit = title.trim() && (filePath || hasExternalUrl);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/information-hub')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="font-heading text-lg font-semibold text-foreground tracking-tight">Submit Resource</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => submit()} disabled={!canSubmit || createResource.isPending}>
            <Send className="w-4 h-4 mr-2" />
            {createResource.isPending ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </div>
      </div>

      <div className="p-3">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 lg:w-[70%] space-y-6">
            <div className="bg-card rounded-lg border border-border shadow-card px-4 py-3">
              <Input
                placeholder="Resource title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-heading font-bold border-0 bg-transparent px-0 h-auto py-2 focus-visible:ring-0 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 tracking-tight"
              />
            </div>

            <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                <span className="text-xs font-medium text-muted-foreground">Description</span>
              </div>
              <Textarea
                ref={descriptionRef}
                placeholder="A short description about the resource"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="min-h-[180px] border-0 rounded-none resize-none focus-visible:ring-0 px-4 py-4 text-base leading-relaxed bg-card"
              />
            </div>

            <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Upload File (Optional)</span>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  <ResourceUploader onFileSelected={handleFileSelected} isUploading={uploadResource.isPending} />
                  {fileName && (
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <FileText className="w-4 h-4" />
                      <span>{fileName}</span>
                      <span className="text-xs text-muted-foreground">({(fileMeta?.fileSize ? fileMeta.fileSize / 1024 / 1024 : 0).toFixed(2)} MB)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">External Link (Optional)</span>
              </div>
              <div className="p-4 space-y-2">
                <Input
                  placeholder="https://example.com/resource"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  type="url"
                />
                <p className="text-xs text-muted-foreground">
                  You can submit with file only, link only, or both.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:w-[30%] space-y-4">
            {/* Resource Type, Category, and Tags controls removed — defaults applied */}

            <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
              <div className="p-4 space-y-3">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Target className="w-3.5 h-3.5" />Access</span>
                <button type="button" onClick={() => setIsPublic((v) => !v)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-sm transition-colors ${isPublic ? 'bg-primary-50 border-primary-200 text-primary-900' : 'border-border hover:bg-zinc-50 text-muted-foreground'}`}>
                  <span className="flex-1 text-left">Public resource</span>
                  <div className={`w-8 h-5 rounded-full transition-colors flex items-center ${isPublic ? 'bg-primary-900 justify-end' : 'bg-zinc-200 justify-start'}`}>
                    <div className="w-3.5 h-3.5 rounded-full bg-white mx-0.5 shadow-sm" />
                  </div>
                </button>
              </div>

              {!isPublic && (
                <>
                  <div className="border-t border-border">
                    <button type="button" onClick={() => setShowTargeting((v) => !v)} className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Target className="w-3.5 h-3.5" />Who can access this?</span>
                      {showTargeting ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    {showTargeting && (
                      <div className="px-4 pb-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mt-3 mb-3">Leave empty to make available to all employees</p>
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
