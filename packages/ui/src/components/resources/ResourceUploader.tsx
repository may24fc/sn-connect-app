'use client';

import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { FileDropZone } from '../../primitives/file-drop-zone';

export interface ResourceUploaderProps {
  accept?: string;
  maxSizeMB?: number;
  onFileSelected: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  /** Currently selected file (for showing in preview) */
  selectedFile?: File | null;
  /** Callback to clear the selected file */
  onClearFile?: () => void;
}

export function ResourceUploader({
  accept = 'video/mp4,video/webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/jpeg,image/png,image/gif',
  maxSizeMB = undefined,
  onFileSelected,
  isUploading,
  uploadProgress,
  selectedFile,
  onClearFile,
}: ResourceUploaderProps): ReactNode {
  const handleFiles = useCallback(
    (files: Array<File>) => {
      const file = files[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleRemove = useCallback(
    (_index: number) => {
      onClearFile?.();
    },
    [onClearFile]
  );

  return (
    <FileDropZone
      onFilesSelected={handleFiles}
      accept={accept}
      maxSizeMB={maxSizeMB}
      isUploading={isUploading}
      uploadProgress={uploadProgress}
      label="Drag & drop a file here"
      hint="or click to browse"
      formatHint={`Video, PDF, Office, Images`}
      selectedFiles={selectedFile ? [selectedFile] : undefined}
      onRemoveFile={onClearFile ? handleRemove : undefined}
    />
  );
}
