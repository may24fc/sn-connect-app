import { FileText } from 'lucide-react';
import type * as React from 'react';
import { Button } from '../../primitives/button';
import { cn } from '../../utils/cn';

export interface DocumentViewerProps {
  src: string;
  fileName?: string;
  mimeType?: string;
  className?: string;
  onDownload?: () => void;
}

export function DocumentViewer({
  src,
  fileName,
  mimeType,
  className,
  onDownload,
}: DocumentViewerProps): React.ReactNode {
  const isPdf = mimeType === 'application/pdf' || src.endsWith('.pdf');

  if (isPdf) {
    return (
      <div
        className={cn(
          'rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800',
          className
        )}
      >
        <iframe src={src} title={fileName ?? 'Document'} className="w-full h-[600px]" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 flex flex-col items-center justify-center gap-4 min-h-[300px]',
        className
      )}
    >
      <FileText className="h-12 w-12 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {fileName ?? 'Document preview is not available'}
      </p>
      {onDownload ? (
        <Button variant="outline" size="sm" onClick={onDownload}>
          Download to View
        </Button>
      ) : null}
    </div>
  );
}
