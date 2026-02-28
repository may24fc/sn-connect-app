'use client';

import type * as React from 'react';
import { FileDropZone } from '../../primitives/file-drop-zone';

export interface UploadZoneProps {
  onFileSelect: (files: Array<File>) => void;
  disabled?: boolean;
  acceptedFileTypes?: string;
  className?: string;
  /** Files currently selected (for showing preview list) */
  selectedFiles?: Array<File>;
  /** Callback to remove a file from the selection */
  onRemoveFile?: (index: number) => void;
  /** Maximum number of files allowed */
  maxFiles?: number;
}

export function UploadZone({
  onFileSelect,
  disabled = false,
  acceptedFileTypes = '.pdf,.docx,.txt,.xlsx',
  className,
  selectedFiles,
  onRemoveFile,
  maxFiles = 5,
}: UploadZoneProps): React.ReactNode {
  return (
    <FileDropZone
      onFilesSelected={onFileSelect}
      accept={acceptedFileTypes}
      multiple
      maxFiles={maxFiles}
      maxSizeMB={10}
      disabled={disabled}
      label="Drag & drop files here"
      hint="or click to browse from your computer"
      formatHint={`Supports PDF, DOCX, TXT, XLSX — max 10 MB (up to ${maxFiles} files)`}
      className={className}
      selectedFiles={selectedFiles}
      onRemoveFile={onRemoveFile}
    />
  );
}
