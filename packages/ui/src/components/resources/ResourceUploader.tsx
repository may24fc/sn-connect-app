'use client';

import { Upload } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Button } from '../../primitives/button';
import { Progress } from '../../primitives/progress';
import { cn } from '../../utils/cn';

export interface ResourceUploaderProps {
  accept?: string;
  maxSizeMB?: number;
  onFileSelected: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function ResourceUploader({
  accept = 'video/mp4,video/webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/jpeg,image/png,image/gif',
  maxSizeMB = 50,
  onFileSelected,
  isUploading,
  uploadProgress,
}: ResourceUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File exceeds ${maxSizeMB}MB limit`);
        return;
      }
      onFileSelected(file);
    },
    [maxSizeMB, onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
        isDragging
          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20'
          : 'border-zinc-200 dark:border-zinc-800',
        isUploading && 'pointer-events-none opacity-60'
      )}
    >
      <Upload className="mx-auto h-8 w-8 text-zinc-400 dark:text-zinc-500 mb-3" strokeWidth={1.5} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
        Drag and drop a file here, or click to browse
      </p>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">Max file size: {maxSizeMB}MB</p>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : 'Browse Files'}
      </Button>

      {isUploading && uploadProgress !== undefined ? (
        <div className="mt-3">
          <Progress value={uploadProgress} className="h-1.5" />
          <p className="text-xs text-zinc-500 mt-1">{uploadProgress}%</p>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-600 mt-2">{error}</p> : null}
    </div>
  );
}
