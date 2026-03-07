'use client';

import { Download, FileText, Loader2, X } from 'lucide-react';
import type * as React from 'react';
import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../primitives/button';
import { cn } from '../../utils/cn';

export interface FullScreenPreviewProps {
  /** Whether the preview is open */
  open: boolean;
  /** Callback when the preview should close */
  onClose: () => void;
  /** URL of the document to preview */
  url: string | null;
  /** File name to display */
  fileName: string;
  /** MIME type of the document */
  mimeType?: string | null;
  /** Whether the preview is loading */
  isLoading?: boolean;
  /** Optional className for the container */
  className?: string;
}

/**
 * Full-screen document preview component (like Google Drive).
 * Uses a portal to render on top of everything.
 */
export function FullScreenPreview({
  open,
  onClose,
  url,
  fileName,
  mimeType,
  isLoading = false,
  className,
}: FullScreenPreviewProps): React.ReactNode {
  // Handle escape key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when preview is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  const handleDownload = useCallback(() => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  }, [url, fileName]);

  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType?.startsWith('image/');

  if (!open) return null;

  const content = (
    <div
      className={cn(
        'fixed inset-0 z-[100] bg-zinc-900/95 backdrop-blur-sm flex flex-col',
        className
      )}
      aria-modal="true"
      aria-label={`Preview: ${fileName}`}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <FileText className="h-5 w-5 text-zinc-400 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-sm font-medium text-zinc-100 truncate">{fileName}</span>
        </div>

        <div className="flex items-center gap-2">
          {url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-zinc-300 hover:text-white hover:bg-zinc-800"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
          </div>
        ) : url ? (
          isPdf ? (
            <iframe
              src={`${url}#toolbar=0&navpanes=0`}
              className="w-full h-full border-0 bg-white"
              title={fileName}
            />
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center p-8 overflow-auto">
              <img src={url} alt={fileName} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-20 w-20 mx-auto mb-6 text-zinc-600" strokeWidth={1} />
                <p className="text-zinc-400 mb-4">Preview not available for this file type</p>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download to view
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-zinc-400">No preview available</p>
          </div>
        )}
      </div>
    </div>
  );

  // Render in portal to ensure it's on top of everything
  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return null;
}
