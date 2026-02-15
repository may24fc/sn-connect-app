'use client';

import { AlertCircle, CheckCircle2, Lightbulb, TrendingUp } from 'lucide-react';
import type * as React from 'react';
import { Badge } from '../../primitives/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
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

/**
 * InsightsSummary - Displays AI-generated or structured narrative insights
 *
 * Features:
 * - Title and summary text
 * - Key findings with metric + insight pairs
 * - Optional recommendations section
 * - Highlighted findings with visual emphasis
 * - Responsive layout
 *
 * @example
 * ```tsx
 * <InsightsSummary
 *   title="Weekly Performance Summary"
 *   summary="Overall performance improved by 15% this week with strong marketing results."
 *   keyFindings={[
 *     {
 *       metric: "Revenue",
 *       insight: "Increased by $12,500 due to successful campaign launch",
 *       highlight: true
 *     },
 *     {
 *       metric: "Expenses",
 *       insight: "Within budget, 5% lower than projected"
 *     }
 *   ]}
 *   recommendations={[
 *     "Continue Facebook ad optimization",
 *     "Consider expanding to Instagram platform"
 *   ]}
 * />
 * ```
 */
export function InsightsSummary({
  title,
  summary,
  keyFindings,
  recommendations,
  className,
}: InsightsSummaryProps): React.ReactElement {
  return (
    <Card className={cn('border-l-4 border-l-blue-500', className)}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Lightbulb className="h-5 w-5 text-blue-600" aria-hidden="true" />
          </div>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Findings Section */}
        {keyFindings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Key Findings
              </h3>
            </div>

            <div className="space-y-3">
              {keyFindings.map((finding, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                    finding.highlight
                      ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                      : 'bg-muted/30 border-muted hover:bg-muted/50'
                  )}
                >
                  {finding.highlight ? (
                    <AlertCircle
                      className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCircle2
                      className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-mono text-xs',
                          finding.highlight
                            ? 'border-amber-300 bg-amber-100 text-amber-900'
                            : 'border-muted-foreground/30'
                        )}
                      >
                        {finding.metric}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{finding.insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations Section */}
        {recommendations && recommendations.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Recommendations
              </h3>
            </div>

            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-blue-600 font-bold mt-0.5 flex-shrink-0" aria-hidden="true">
                    →
                  </span>
                  <span className="leading-relaxed">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
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
