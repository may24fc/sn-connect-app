'use client';

import * as React from 'react';
import { FileText, FileSpreadsheet, File, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { AccessToggle } from './AccessToggle';
import type { KnowledgeSource, AccessLevel } from '../../types/ai-knowledge.types';

export interface SourceRowProps {
  source: KnowledgeSource;
  onAccessChange: (sourceId: string, accessLevel: AccessLevel) => void;
  className?: string;
}

function getFileIcon(fileType: KnowledgeSource['fileType']): React.ReactNode {
  const iconClass = 'h-4 w-4 text-muted-foreground';

  switch (fileType) {
    case 'pdf':
    case 'docx':
    case 'txt':
      return <FileText className={iconClass} />;
    case 'xlsx':
      return <FileSpreadsheet className={iconClass} />;
    default:
      return <File className={iconClass} />;
  }
}

function getStatusIndicator(status: KnowledgeSource['status']): React.ReactNode {
  switch (status) {
    case 'ready':
      return (
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
          <span className="sr-only">Ready</span>
        </div>
      );
    case 'indexing':
    case 'scanning':
    case 'chunking':
      return (
        <div className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 text-warning animate-spin" />
          <span className="sr-only">Processing</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 text-error" />
          <span className="sr-only">Error</span>
        </div>
      );
    default:
      return null;
  }
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export function SourceRow({
  source,
  onAccessChange,
  className,
}: SourceRowProps): React.ReactNode {
  const handleAccessChange = (newAccessLevel: AccessLevel): void => {
    onAccessChange(source.id, newAccessLevel);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3 rounded-lg transition-all',
        'bg-card border border-border/50',
        'hover:border-border hover:shadow-sm',
        'group',
        className
      )}
    >
      {/* File Icon */}
      <div className="flex-shrink-0 px-2 rounded-lg bg-muted/50">
        {getFileIcon(source.fileType)}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium text-foreground truncate"
          title={source.fileName}
        >
          {source.fileName}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDate(source.uploadedAt)}
        </p>
      </div>

      {/* Status Indicator */}
      <div className="flex-shrink-0">{getStatusIndicator(source.status)}</div>

      {/* Access Toggle */}
      <div className="flex-shrink-0">
        <AccessToggle
          value={source.accessLevel}
          onChange={handleAccessChange}
          disabled={source.status !== 'ready'}
        />
      </div>
    </div>
  );
}
