'use client';

import { FileText } from 'lucide-react';
import * as React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../primitives/hover-card';
import { cn } from '../../utils/cn';
import type { Citation } from './citation-utils';

export interface CitationBadgeProps {
  /** The citation number to display (1, 2, 3, etc.) */
  citationId: number;
  /** The full citation data (optional - if not provided, shows number only) */
  citation?: Citation | undefined;
  /** Callback when citation is clicked to highlight in panel */
  onCitationClick?: ((id: number) => void) | undefined;
  /** Custom class name */
  className?: string;
}

/**
 * An inline citation badge that displays [n]. Shows a hover preview card
 * with source details, and clicking opens the full sources panel.
 */
export function CitationBadge({
  citationId,
  citation,
  onCitationClick,
  className,
}: CitationBadgeProps): React.ReactNode {
  const handleClick = (): void => {
    onCitationClick?.(citationId);
  };

  // If no citation data, show a simple badge
  if (!citation) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center',
          'min-w-[1.25rem] h-5 px-1.5 rounded text-[11px] font-medium',
          'bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300',
          'hover:bg-zinc-200 dark:hover:bg-zinc-900/60',
          'transition-colors cursor-pointer',
          'align-super -translate-y-0.5',
          className
        )}
      >
        {citationId}
      </button>
    );
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            'inline-flex items-center justify-center',
            'min-w-[1.25rem] h-5 px-1.5 rounded text-[11px] font-medium',
            'bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300',
            'hover:bg-zinc-200 dark:hover:bg-zinc-900/60',
            'transition-colors cursor-pointer',
            'align-super -translate-y-0.5',
            className
          )}
        >
          {citationId}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="max-w-sm w-80 p-0 rounded-xl shadow-lg" side="top" sideOffset={8}>
        <div className="p-4">
          {/* Source header */}
          <div className="flex items-start gap-2.5 mb-3">
            <div className="flex-shrink-0 p-1.5 rounded bg-zinc-100 dark:bg-zinc-800">
              <FileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {citation.sourceName}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {Math.round(citation.relevanceScore * 100)}% relevance
              </p>
            </div>
          </div>

          {/* Referenced text */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-800 rounded-full" />
            <blockquote className="pl-3 text-[13px] text-zinc-600 dark:text-zinc-300 italic leading-relaxed">
              &ldquo;{citation.citedText || citation.exactQuote}&rdquo;
            </blockquote>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
