'use client';

import { Badge, Button, MarkdownContent } from '@hr-portal/ui';
import type { ReactNode } from 'react';

type EvaluationSummaryViewProps = {
  title: string;
  periodLabel: string;
  summaryMarkdown: string;
  totalSubmissionsAnalyzed: number;
  generatedAt: string;
  isStale: boolean;
  isRegenerating: boolean;
  onRegenerate: () => void;
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EvaluationSummaryView({
  title,
  periodLabel,
  summaryMarkdown,
  totalSubmissionsAnalyzed,
  generatedAt,
  isStale,
  isRegenerating,
  onRegenerate,
}: EvaluationSummaryViewProps): ReactNode {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {title}
            </p>
            <p className="text-sm text-muted-foreground">
              {periodLabel} • {totalSubmissionsAnalyzed} submission{totalSubmissionsAnalyzed === 1 ? '' : 's'} analyzed
            </p>
            <p className="text-sm text-muted-foreground">
              Generated {formatDateTime(generatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isStale ? 'secondary' : 'success'}>
              {isStale ? 'New submissions detected' : 'Up to date'}
            </Badge>
            {isStale ? (
              <Button onClick={onRegenerate} disabled={isRegenerating}>
                {isRegenerating ? 'Regenerating...' : 'Regenerate Summary'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-background/70 p-5 shadow-sm shadow-black/5">
        <MarkdownContent content={summaryMarkdown} className="space-y-4 text-foreground/90" />
      </div>
    </div>
  );
}