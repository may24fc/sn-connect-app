'use client';

import { Lightbulb } from 'lucide-react';
import type * as React from 'react';
import { cn } from '../../utils/cn';

export interface KeyFinding {
  metric: string;
  insight: string;
  highlight?: boolean;
}

export interface InsightsSummaryProps {
  title: string;
  summary: string;
  keyFindings: Array<KeyFinding>;
  recommendations?: Array<string>;
  className?: string;
}

export function InsightsSummary({
  title,
  summary,
  keyFindings,
  recommendations,
  className,
}: InsightsSummaryProps): React.ReactElement {
  return (
    <div
      className={cn(
        'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 space-y-1">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{title}</h3>
        </div>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{summary}</p>
      </div>

      {/* Key Findings */}
      {keyFindings.length > 0 && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 space-y-2">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Key Findings</p>
          <div className="space-y-1.5">
            {keyFindings.map((finding, index) => (
              <div
                key={index}
                className="flex items-baseline gap-2 text-sm"
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full shrink-0 mt-1.5',
                    finding.highlight
                      ? 'bg-amber-500'
                      : 'bg-zinc-300 dark:bg-zinc-600'
                  )}
                />
                <span className="text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium text-zinc-900 dark:text-zinc-200">
                    {finding.metric}:
                  </span>{' '}
                  {finding.insight}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 space-y-2">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Recommendations</p>
          <ul className="space-y-1">
            {recommendations.map((recommendation, index) => (
              <li key={index} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                <span className="text-zinc-400 dark:text-zinc-500 shrink-0">→</span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * InsightsSummaryList - Stacked layout for multiple insight summaries
 *
 * @example
 * ```tsx
 * <InsightsSummaryList>
 *   <InsightsSummary {...summary1} />
 *   <InsightsSummary {...summary2} />
 * </InsightsSummaryList>
 * ```
 */
export function InsightsSummaryList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}
