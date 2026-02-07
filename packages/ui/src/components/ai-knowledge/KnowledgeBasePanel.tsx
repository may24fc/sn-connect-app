'use client';

import * as React from 'react';
import { cn } from '../../utils/cn';
import { UploadZone } from './UploadZone';
import { UploadProgress } from './UploadProgress';
import { SourcesInventory } from './SourcesInventory';
import type { KnowledgeSource, FileStatus, AccessLevel } from '../../types/ai-knowledge.types';

export interface KnowledgeBasePanelProps {
  sources: KnowledgeSource[];
  onSourcesChange: (sources: KnowledgeSource[]) => void;
  className?: string;
}

interface UploadingFile {
  id: string;
  fileName: string;
  stage: FileStatus;
}

export function KnowledgeBasePanel({
  sources,
  onSourcesChange,
  className,
}: KnowledgeBasePanelProps): React.ReactNode {
  const [uploadingFiles, setUploadingFiles] = React.useState<UploadingFile[]>([]);

  const handleFileSelect = (files: File[]): void => {
    const newUploads: UploadingFile[] = files.map((file) => ({
      id: `upload-${Date.now()}-${Math.random()}`,
      fileName: file.name,
      stage: 'scanning' as FileStatus,
    }));

    setUploadingFiles((prev) => [...prev, ...newUploads]);

    // Simulate upload process for each file
    newUploads.forEach((upload) => {
      simulateUpload(upload);
    });
  };

  const simulateUpload = async (upload: UploadingFile): Promise<void> => {
    const stages: FileStatus[] = ['scanning', 'chunking', 'indexing', 'ready'];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];

      // Type guard to satisfy TypeScript - stage will always be defined since we're iterating over the array
      if (!stage) continue;

      // Update the stage
      setUploadingFiles((prev) =>
        prev.map((u) => (u.id === upload.id && stage ? { ...u, stage } : u))
      );

      // Wait before moving to next stage (except for the last stage)
      if (i < stages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    // After reaching 'ready', add to sources and remove from uploading
    setTimeout(() => {
      const fileExtension = upload.fileName.split('.').pop()?.toLowerCase() || 'txt';
      const fileType = (['pdf', 'docx', 'txt', 'xlsx'].includes(fileExtension)
        ? fileExtension
        : 'txt') as KnowledgeSource['fileType'];

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
      setUploadingFiles((prev) => prev.filter((u) => u.id !== upload.id));
    }, 500);
  };

  const handleAccessChange = (sourceId: string, newAccessLevel: AccessLevel): void => {
    const updatedSources = sources.map((source) =>
      source.id === sourceId ? { ...source, accessLevel: newAccessLevel } : source
    );
    onSourcesChange(updatedSources);
  };

  return (
    <div className={cn('flex flex-col h-full bg-background rounded-lg', className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-6 py-4">
        <h2 className="text-md font-semibold text-foreground">Knowledge Base</h2>
      </div>

      {/* Upload Zone - Fixed, not scrollable */}
      <div className="flex-shrink-0 px-6 py-5">
        <UploadZone
          onFileSelect={handleFileSelect}
          disabled={uploadingFiles.length > 0}
        />

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
        <SourcesInventory
          sources={sources}
          onAccessChange={handleAccessChange}
          className="h-full"
        />
      </div>
    </div>
  );
}
