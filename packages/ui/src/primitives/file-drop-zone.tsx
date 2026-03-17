'use client';

import * as React from 'react';
import { cn } from '../utils/cn';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FileDropZoneProps {
  /** Callback when files are selected via drag-drop or browse */
  onFilesSelected: (files: Array<File>) => void;
  /** Comma-separated accepted MIME types / extensions */
  accept?: string | undefined;
  /** Allow selecting multiple files */
  multiple?: boolean | undefined;
  /** Maximum number of files allowed (only applies when multiple=true) */
  maxFiles?: number | undefined;
  /** Maximum file size in megabytes — validated on the client */
  maxSizeMB?: number | undefined;
  /** Disable the drop zone */
  disabled?: boolean | undefined;
  /** Show compact (inline) variant instead of full-height */
  compact?: boolean | undefined;
  /** Primary label text (e.g. "Drag & drop your files here") */
  label?: string | undefined;
  /** Secondary hint shown below the label */
  hint?: string | undefined;
  /** Descriptive text for supported formats (e.g. "PDF, DOCX, TXT — max 10 MB") */
  formatHint?: string | undefined;
  /** Currently uploading — renders progress state */
  isUploading?: boolean | undefined;
  /** Upload progress percentage (0–100) */
  uploadProgress?: number | undefined;
  /** External className for the root wrapper */
  className?: string | undefined;
  /** Icon override — defaults to an upload cloud icon */
  icon?: React.ReactNode | undefined;
  /** Files currently selected (for showing preview list) */
  selectedFiles?: Array<File> | undefined;
  /** Callback to remove a file from the selection */
  onRemoveFile?: ((index: number) => void) | undefined;
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function CloudUploadIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}

function FileUpIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M12 12v6" />
      <path d="m15 15-3-3-3 3" />
    </svg>
  );
}

function FilePdfIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 12h4" />
      <path d="M10 18h4" />
      <path d="M10 15h4" />
    </svg>
  );
}

function FileDocIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

function FileSpreadsheetIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M8 13h2" />
      <path d="M14 13h2" />
      <path d="M8 17h2" />
      <path d="M14 17h2" />
    </svg>
  );
}

function FileImageIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <circle cx="10" cy="12" r="2" />
      <path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22" />
    </svg>
  );
}

function FilePresentationIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <rect x="8" y="12" width="8" height="6" rx="1" />
    </svg>
  );
}

function FileGenericIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getFileTypeIcon(file: File): React.ReactNode {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mime = file.type.toLowerCase();

  // PDF
  if (ext === 'pdf' || mime === 'application/pdf') {
    return <FilePdfIcon className="h-4 w-4 text-rose-500" />;
  }
  // Word
  if (['doc', 'docx'].includes(ext) || mime.includes('word')) {
    return <FileDocIcon className="h-4 w-4 text-blue-600" />;
  }
  // Excel
  if (
    ['xls', 'xlsx', 'csv'].includes(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('excel')
  ) {
    return <FileSpreadsheetIcon className="h-4 w-4 text-emerald-600" />;
  }
  // PowerPoint
  if (
    ['ppt', 'pptx'].includes(ext) ||
    mime.includes('presentation') ||
    mime.includes('powerpoint')
  ) {
    return <FilePresentationIcon className="h-4 w-4 text-orange-500" />;
  }
  // Images
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return <FileImageIcon className="h-4 w-4 text-violet-500" />;
  }
  // Generic
  return <FileGenericIcon className="h-4 w-4 text-muted-foreground" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FileDropZone({
  onFilesSelected,
  accept,
  multiple = false,
  maxFiles,
  maxSizeMB,
  disabled = false,
  compact = false,
  label,
  hint,
  formatHint,
  isUploading = false,
  uploadProgress,
  className,
  icon,
  selectedFiles,
  onRemoveFile,
}: FileDropZoneProps): React.ReactNode {
  const [isDragging, setIsDragging] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragCounterRef = React.useRef(0);

  const effectiveDisabled = disabled || isUploading;
  const hasFiles = selectedFiles && selectedFiles.length > 0;
  const canAddMore = !maxFiles || !selectedFiles || selectedFiles.length < maxFiles;

  /* -- Validation -------------------------------------------------- */
  const validateFiles = React.useCallback(
    (files: Array<File>): Array<File> => {
      setValidationError(null);
      let validFiles = files;

      // Check file size
      if (maxSizeMB) {
        const oversized = validFiles.filter((f) => f.size > maxSizeMB * 1024 * 1024);
        if (oversized.length > 0) {
          setValidationError(
            `${oversized.length === 1 ? 'File' : `${oversized.length} files`} exceeded the ${maxSizeMB} MB limit`
          );
          validFiles = validFiles.filter((f) => f.size <= maxSizeMB * 1024 * 1024);
        }
      }

      // Check max files limit
      if (maxFiles && multiple) {
        const currentCount = selectedFiles?.length ?? 0;
        const allowedCount = maxFiles - currentCount;
        if (validFiles.length > allowedCount) {
          if (allowedCount <= 0) {
            setValidationError(`Maximum ${maxFiles} files allowed`);
            return [];
          }
          setValidationError(
            `Only ${allowedCount} more file${allowedCount === 1 ? '' : 's'} allowed (max ${maxFiles})`
          );
          validFiles = validFiles.slice(0, allowedCount);
        }
      }

      return validFiles;
    },
    [maxSizeMB, maxFiles, multiple, selectedFiles]
  );

  /* -- Handlers ---------------------------------------------------- */
  const handleDragEnter = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (!effectiveDisabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (effectiveDisabled) return;

    const dropped = Array.from(e.dataTransfer.files);
    const valid = validateFiles(dropped);
    if (valid.length > 0) {
      const result = multiple ? valid : valid[0];
      if (result) {
        onFilesSelected(Array.isArray(result) ? result : [result]);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length > 0) {
      const valid = validateFiles(selected);
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    }
    e.target.value = '';
  };

  const handleClick = (): void => {
    if (!effectiveDisabled) inputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if ((e.key === 'Enter' || e.key === ' ') && !effectiveDisabled) {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  /* -- Derived display text ---------------------------------------- */
  const fileCountLabel = hasFiles
    ? `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} selected`
    : null;

  const primaryLabel =
    label ??
    (isDragging
      ? 'Drop to upload'
      : hasFiles && !multiple
        ? fileCountLabel
        : compact
          ? 'Click to upload or drag & drop'
          : 'Drag & drop files here');

  const secondaryHint =
    hint ??
    (hasFiles && canAddMore && multiple
      ? 'Drop more files or click to add'
      : !compact
        ? 'or click to browse'
        : undefined);

  const defaultFormatHint = formatHint ?? (maxSizeMB ? `Max ${maxSizeMB} MB per file` : undefined);

  /* -- Render ------------------------------------------------------ */
  return (
    <div
      className={cn(
        'group relative rounded-lg border-2 border-dashed transition-all duration-200',
        // Default
        !isDragging &&
          !effectiveDisabled &&
          'border-zinc-200 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50/40 dark:hover:bg-slate-950/20',
        // Dragging
        isDragging &&
          !effectiveDisabled &&
          'border-slate-500 dark:border-slate-400 bg-slate-50/60 dark:bg-slate-950/30 scale-[1.01]',
        // Disabled / uploading
        effectiveDisabled &&
          'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 cursor-not-allowed opacity-60',
        !effectiveDisabled && 'cursor-pointer',
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={effectiveDisabled ? -1 : 0}
      aria-label={`${primaryLabel}. ${secondaryHint ?? ''}`}
      aria-disabled={effectiveDisabled}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleInputChange}
        disabled={effectiveDisabled}
        className="sr-only"
        tabIndex={-1}
      />

      <div
        className={cn(
          'flex items-center gap-4',
          compact ? 'px-4 py-3' : 'flex-col justify-center px-6 py-8'
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            'flex items-center justify-center rounded-lg transition-all duration-200',
            compact ? 'h-9 w-9 shrink-0' : 'h-12 w-12',
            isDragging && !effectiveDisabled
              ? 'bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-400'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 group-hover:bg-slate-100 dark:group-hover:bg-slate-900/40 group-hover:text-slate-700 dark:group-hover:text-slate-400'
          )}
        >
          {icon ??
            (isDragging ? (
              <FileUpIcon className={compact ? 'h-4 w-4' : 'h-6 w-6'} />
            ) : (
              <CloudUploadIcon className={compact ? 'h-4 w-4' : 'h-6 w-6'} />
            ))}
        </div>

        {/* Text */}
        <div className={cn(compact ? 'min-w-0 flex-1' : 'text-center space-y-1')}>
          <p
            className={cn(
              'text-sm font-medium',
              isDragging && !effectiveDisabled
                ? 'text-slate-700 dark:text-slate-400'
                : 'text-zinc-700 dark:text-zinc-300'
            )}
          >
            {isUploading ? 'Uploading…' : primaryLabel}
          </p>
          {secondaryHint && !isUploading && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{secondaryHint}</p>
          )}
        </div>

        {/* Browse button (full variant only) */}
        {!compact && !isUploading && (
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-md text-xs font-medium',
              'px-3 py-1.5 border border-zinc-200 dark:border-zinc-700',
              'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
              'transition-colors',
              !effectiveDisabled &&
                'group-hover:border-slate-300 dark:group-hover:border-slate-700 group-hover:text-slate-700 dark:group-hover:text-slate-400'
            )}
          >
            Browse files
          </span>
        )}
      </div>

      {/* Format hint */}
      {defaultFormatHint && !isUploading && (
        <p
          className={cn(
            'text-[11px] text-zinc-400 dark:text-zinc-500 pb-3',
            compact ? 'px-4' : 'text-center'
          )}
        >
          {defaultFormatHint}
        </p>
      )}

      {/* Upload progress */}
      {isUploading && uploadProgress !== undefined && (
        <div className={cn('px-4 pb-3', !compact && 'px-6')}>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-slate-900 dark:bg-slate-800 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(uploadProgress, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 text-right tabular-nums">
            {uploadProgress}%
          </p>
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <p
          className={cn(
            'text-xs text-rose-600 dark:text-rose-400 pb-3',
            compact ? 'px-4' : 'text-center px-6'
          )}
        >
          {validationError}
        </p>
      )}

      {/* Selected files preview list */}
      {hasFiles && onRemoveFile && (
        <div
          className={cn(
            'border-t border-zinc-100 dark:border-zinc-800',
            compact ? 'px-4 py-2' : 'px-6 py-3'
          )}
        >
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center gap-3 rounded-md bg-zinc-50 dark:bg-zinc-900 px-3 py-2"
              >
                <div className="shrink-0">{getFileTypeIcon(file)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(index);
                  }}
                  className="shrink-0 rounded-full p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {maxFiles && multiple && (
            <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
              {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected (max {maxFiles})
            </p>
          )}
        </div>
      )}
    </div>
  );
}
