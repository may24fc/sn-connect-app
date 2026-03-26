'use client';

import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type * as React from 'react';
import { Button } from '../../primitives/button';
import type { SourceAttribution } from '../../types/ai-knowledge.types';
import { cn } from '../../utils/cn';

export interface DebugPanelProps {
  sources: Array<SourceAttribution>;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function DebugPanel({
  sources,
  isExpanded,
  onToggle,
  className,
}: DebugPanelProps): React.ReactNode {
  return (
    <div className={cn('mt-2 space-y-2', className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="h-auto py-1.5 px-2.5 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
            Hide Sources
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
            View Sources ({sources.length})
          </>
        )}
      </Button>

      {isExpanded && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-card">
          <h4 className="text-xs font-semibold text-foreground">
            Source Attributions
          </h4>
          {sources.map((source, index) => (
            <div
              key={`${source.sourceId}-${index}`}
              className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-md bg-muted">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-medium text-foreground truncate">{source.fileName}</p>
                  {source.pageNumber && (
                    <p className="text-xs text-muted-foreground">Page {source.pageNumber}</p>
                  )}
                  {source.chunkPreview && (
                    <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed italic">
                      "{source.chunkPreview}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
