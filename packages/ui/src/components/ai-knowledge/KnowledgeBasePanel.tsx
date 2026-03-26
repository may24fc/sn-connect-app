'use client';

import * as React from 'react';
import { Skeleton } from '../../primitives/skeleton';
import type { AccessLevel, FileStatus, KnowledgeSource } from '../../types/ai-knowledge.types';
import { cn } from '../../utils/cn';
import { SourcesInventory } from './SourcesInventory';
import { UploadProgress } from './UploadProgress';
import { UploadZone } from './UploadZone';

export interface KnowledgeBasePanelProps {
  /** External sources from API (when undefined, uses internal state) */
  sources: Array<KnowledgeSource>;
  onSourcesChange: (sources: Array<KnowledgeSource>) => void;
  /** Called when files are selected for upload (API integration) */
  onUploadFiles?: (files: Array<File>) => void;
  /** Called when a source's access level changes (API integration) */
  onAccessChange?: (sourceId: string, accessLevel: AccessLevel) => void;
  /** Called when a source is deleted */
  onDeleteSource?: (sourceId: string) => void;
  /** Whether sources are currently loading from the API */
  isLoading?: boolean;
  /** Upload state for files currently being processed */
  uploadingFiles?: Array<{ id: string; fileName: string; stage: FileStatus }>;
  className?: string;
}

interface InternalUploadingFile {
  id: string;
  fileName: string;
  stage: FileStatus;
}

export function KnowledgeBasePanel({
  sources,
  onSourcesChange,
  onUploadFiles,
  onAccessChange: externalAccessChange,
  onDeleteSource,
  isLoading = false,
  uploadingFiles: externalUploadingFiles,
  className,
}: KnowledgeBasePanelProps): React.ReactNode {
  const [internalUploadingFiles, setInternalUploadingFiles] = React.useState<
    Array<InternalUploadingFile>
  >([]);

  const uploadingFiles = externalUploadingFiles ?? internalUploadingFiles;

  const handleFileSelect = (files: Array<File>): void => {
    if (onUploadFiles) {
      onUploadFiles(files);
      return;
    }

    // Fallback: simulate upload for standalone mode
    const newUploads: Array<InternalUploadingFile> = files.map((file) => ({
      id: `upload-${Date.now()}-${Math.random()}`,
      fileName: file.name,
      stage: 'scanning' as FileStatus,
    }));

    setInternalUploadingFiles((prev) => [...prev, ...newUploads]);

    for (const upload of newUploads) {
      simulateUpload(upload);
    }
  };

  const simulateUpload = async (upload: InternalUploadingFile): Promise<void> => {
    const stages: Array<FileStatus> = ['scanning', 'chunking', 'indexing', 'ready'];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      if (!stage) continue;

      setInternalUploadingFiles((prev) =>
        prev.map((u) => (u.id === upload.id ? { ...u, stage } : u))
      );

      if (i < stages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setTimeout(() => {
      const fileExtension = upload.fileName.split('.').pop()?.toLowerCase() || 'txt';
      const fileType = (
        ['pdf', 'docx', 'txt', 'xlsx'].includes(fileExtension) ? fileExtension : 'txt'
      ) as KnowledgeSource['fileType'];

      const newSource: KnowledgeSource = {
        id: `source-${Date.now()}`,
        fileName: upload.fileName,
        fileType,
        uploadedAt: new Date(),
        uploadedBy: 'admin',
        status: 'ready',
        accessLevel: 'all',
        pageCount: Math.floor(Math.random() * 50) + 1,
      };

      onSourcesChange([...sources, newSource]);
      setInternalUploadingFiles((prev) => prev.filter((u) => u.id !== upload.id));
    }, 500);
  };

  const handleAccessChange = (sourceId: string, newAccessLevel: AccessLevel): void => {
    if (externalAccessChange) {
      externalAccessChange(sourceId, newAccessLevel);
      return;
    }

    const updatedSources = sources.map((source) =>
      source.id === sourceId ? { ...source, accessLevel: newAccessLevel } : source
    );
    onSourcesChange(updatedSources);
  };

  return (
    <div className={cn('flex flex-col h-full bg-card rounded-lg', className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-6 py-4">
        <h2 className="text-md font-semibold text-foreground">Knowledge Base</h2>
      </div>

      {/* Upload Zone - Fixed, not scrollable */}
      <div className="flex-shrink-0 px-6 py-5">
        <UploadZone onFileSelect={handleFileSelect} disabled={uploadingFiles.length > 0} />

        {/* Upload Progress */}
        {uploadingFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploadingFiles.map((upload) => (
              <UploadProgress
                key={upload.id}
                fileName={upload.fileName}
                currentStage={upload.stage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex-shrink-0 border-t border-border mx-6" />

      {/* Sources Inventory - Scrollable */}
      <div className="flex-1 min-h-0 px-6 py-3">
        {isLoading ? (
          <SourcesLoadingSkeleton />
        ) : (
          <SourcesInventory
            sources={sources}
            onAccessChange={handleAccessChange}
            {...(onDeleteSource && { onDeleteSource })}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}

function SourcesLoadingSkeleton(): React.ReactNode {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="flex gap-3 mb-4">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={`source-skeleton-${i}`} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}
