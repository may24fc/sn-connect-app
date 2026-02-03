'use client';

import * as React from 'react';
import { Calendar, Clock, BookOpen, AlertCircle, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { Badge } from '../../primitives/badge';
import { Button } from '../../primitives/button';
import { ReportStatusBadge } from './InternStatusBadge';
import { cn } from '../../utils/cn';
import type { DailyReport } from '../../types/internship.types';

interface DailyReportCardProps {
  report: DailyReport;
  className?: string;
  defaultExpanded?: boolean;
}

export function DailyReportCard({
  report,
  className,
  defaultExpanded = false,
}: DailyReportCardProps): React.ReactNode {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const formattedDate = new Date(report.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{formattedDate}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {report.hoursLogged} hours
                </Badge>
                <ReportStatusBadge status={report.status} />
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-2">
          {/* Tasks Completed */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              Tasks Completed
            </div>
            <p className="text-sm pl-6 whitespace-pre-wrap">{report.tasksCompleted}</p>
          </div>

          {/* Learnings */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              Key Learnings
            </div>
            <p className="text-sm pl-6 whitespace-pre-wrap">{report.learnings}</p>
          </div>

          {/* Challenges */}
          {report.challenges && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-warning">
                <AlertCircle className="h-4 w-4" />
                Challenges Faced
              </div>
              <p className="text-sm pl-6 whitespace-pre-wrap">{report.challenges}</p>
            </div>
          )}

          {/* Supervisor Feedback */}
          {report.supervisorFeedback && (
            <div className="space-y-2 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <MessageSquare className="h-4 w-4" />
                Supervisor Feedback
              </div>
              <p className="text-sm pl-6 whitespace-pre-wrap bg-success/5 p-3 rounded-lg">
                {report.supervisorFeedback}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

interface DailyReportListProps {
  reports: DailyReport[];
  emptyMessage?: string;
  className?: string;
}

export function DailyReportList({
  reports,
  emptyMessage = 'No reports found',
  className,
}: DailyReportListProps): React.ReactNode {
  if (reports.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {reports.map((report) => (
        <DailyReportCard key={report.id} report={report} />
      ))}
    </div>
  );
}

interface DailyReportSummaryProps {
  report: DailyReport;
  className?: string;
  onClick?: () => void;
}

export function DailyReportSummary({
  report,
  className,
  onClick,
}: DailyReportSummaryProps): React.ReactNode {
  const formattedDate = new Date(report.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center gap-3">
        <div className="text-center min-w-[50px]">
          <p className="text-sm font-semibold">{formattedDate}</p>
        </div>
        <div className="border-l border-border pl-3">
          <p className="text-sm font-medium line-clamp-1">
            {report.tasksCompleted.slice(0, 60)}
            {report.tasksCompleted.length > 60 ? '...' : ''}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {report.hoursLogged} hrs
            </span>
            <ReportStatusBadge status={report.status} />
          </div>
        </div>
      </div>
      {report.supervisorFeedback && (
        <MessageSquare className="h-4 w-4 text-success shrink-0" />
      )}
    </div>
  );
}
