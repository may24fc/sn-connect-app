'use client';

import * as React from 'react';
import { Upload, FileUp } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface UploadZoneProps {
  onFileSelect: (files: File[]) => void;
  disabled?: boolean;
  acceptedFileTypes?: string;
  className?: string;
}

export function UploadZone({
  onFileSelect,
  disabled = false,
  acceptedFileTypes = '.pdf,.docx,.txt,.xlsx',
  className,
}: UploadZoneProps): React.ReactNode {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      onFileSelect(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleClick = (): void => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 border-dashed transition-all',
        isDragging && !disabled && 'border-primary bg-primary/5 scale-[1.02]',
        !isDragging && !disabled && 'border-border/60 hover:border-primary/40 hover:bg-muted/20',
        disabled && 'border-muted bg-muted/30 cursor-not-allowed opacity-50',
        !disabled && 'cursor-pointer',
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload documents. Click or drag and drop files here."
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptedFileTypes}
        onChange={handleFileInputChange}
        disabled={disabled}
        className="sr-only"
        aria-hidden="true"
      />

      <div className="flex flex-col items-center justify-center px-6 py-4 gap-4">
        {/* Upload Icon */}
        <div
          className={cn(
            'rounded-full p-4 transition-all',
            isDragging && !disabled
              ? 'bg-primary/15 text-primary scale-110'
              : 'bg-muted/80 text-muted-foreground'
          )}
        >
          {isDragging ? (
            <FileUp className="h-4 w-4" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </div>

        {/* Text Content */}
        <div className="text-center space-y-1.5">
          <p className="text-sm font-medium text-foreground">
            {isDragging ? 'Drop files to upload' : 'Drag & drop files here'}
          </p>
          <p className="text-xs text-muted-foreground">
            or click to browse from your computer
          </p>
        </div>

        {/* Supported Formats */}
        <p className="text-[11px] text-muted-foreground/70">
          Supports PDF, DOCX, TXT, XLSX (Max 10MB)
        </p>
      </div>

      {/* Focus indicator */}
      <div
        className={cn(
          'absolute inset-0 rounded-xl pointer-events-none transition-all',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background'
        )}
      />
    </div>
  );
}
