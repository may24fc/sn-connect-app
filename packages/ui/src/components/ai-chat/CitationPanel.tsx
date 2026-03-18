'use client';

import { BookOpen, FileText, X } from 'lucide-react';
import * as React from 'react';
import { Button } from '../../primitives/button';
import { cn } from '../../utils/cn';
import type { Citation } from './citation-utils';

export interface CitationPanelProps {
  /** Whether the panel is open */
  open: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Array of citations to display */
  citations: Citation[];
  /** Currently highlighted citation ID */
  highlightedId?: number | undefined;
  /** Custom class name */
  className?: string;
}

/**
 * A flex-based side panel that displays all citations/sources for an AI response.
 * Designed to be a flex sibling inside the chat panel layout (not a fixed overlay).
 * Can highlight a specific citation when its badge is clicked.
 */
export function CitationPanel({
  open,
  onClose,
  citations,
  highlightedId,
  className,
}: CitationPanelProps): React.ReactNode {
  const highlightedRef = React.useRef<HTMLDivElement>(null);

  // Scroll to highlighted citation when it changes
  React.useEffect(() => {
    if (highlightedId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedId]);

  return (
    <div
      className={cn(
        'flex flex-col flex-shrink-0',
        'border-l border-zinc-200 dark:border-zinc-800',
        'bg-white dark:bg-zinc-950',
        'transition-all duration-300 ease-in-out overflow-hidden',
        open ? 'w-80 opacity-100' : 'w-0 opacity-0',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/30">
            <BookOpen className="h-4 w-4 text-slate-700 dark:text-slate-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Sources
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {citations.length} reference{citations.length !== 1 ? 's' : ''} used
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close sources panel</span>
        </Button>
      </div>

      {/* Citations list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {citations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No sources cited
            </p>
          </div>
        ) : (
          citations.map((citation) => {
            const isHighlighted = highlightedId === citation.id;
            return (
              <div
                key={citation.id}
                ref={isHighlighted ? highlightedRef : undefined}
                className={cn(
                  'rounded-lg border p-4 transition-all duration-200',
                  isHighlighted
                    ? 'border-slate-500 bg-slate-50 dark:bg-slate-950/30 ring-1 ring-slate-500'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50'
                )}
              >
                {/* Source header */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={cn(
                      'flex-shrink-0 flex items-center justify-center h-6 w-6 rounded text-xs font-bold',
                      isHighlighted
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300'
                    )}
                  >
                    {citation.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {citation.sourceName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {Math.round(citation.relevanceScore * 100)}% match
                      </span>
                    </div>
                  </div>
                </div>

                {/* Referenced text from the AI response */}
                {citation.citedText && (
                  <div className="mb-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                      Referenced in response
                    </p>
                    <div className="relative pl-3 border-l-2 border-slate-500 dark:border-slate-400">
                      <p className="text-[13px] text-zinc-700 dark:text-zinc-200 leading-relaxed">
                        {citation.citedText}
                      </p>
                    </div>
                  </div>
                )}

                {/* Source excerpt */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                    {citation.citedText ? 'From source' : 'Source excerpt'}
                  </p>
                  <div className="relative pl-3 border-l-2 border-zinc-300 dark:border-zinc-700">
                    <blockquote className={cn(
                      'text-[13px] italic leading-relaxed',
                      citation.citedText
                        ? 'text-zinc-400 dark:text-zinc-500'
                        : 'text-zinc-600 dark:text-zinc-300'
                    )}>
                      &ldquo;{citation.exactQuote}&rdquo;
                    </blockquote>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
