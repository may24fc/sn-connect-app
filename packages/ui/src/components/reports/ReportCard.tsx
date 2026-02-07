'use client';

import * as React from 'react';
import { Calendar, Paperclip, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../primitives/card';
import { Button } from '../../primitives/button';
import { cn } from '../../utils/cn';
import { ReportStatusBadge } from './ReportStatusBadge';
import type { ReportSubmission } from './types';
import { formatPeriodLabel, calculateTotalExpenditure, calculateTotalResults, calculateROI } from './types';

interface ReportCardProps {
  report: ReportSubmission;
  onView?: (report: ReportSubmission) => void;
  onEdit?: (report: ReportSubmission) => void;
  onSubmit?: (report: ReportSubmission) => void;
  className?: string;
  showActions?: boolean;
}

export function ReportCard({
  report,
  onView,
  onEdit,
  onSubmit,
  className,
  showActions = true,
}: ReportCardProps): React.ReactNode {
  const periodLabel = formatPeriodLabel(report.periodStart, report.periodEnd);
  const totalExpenditure = calculateTotalExpenditure(report.content.metrics);
  const totalResults = calculateTotalResults(report.content.metrics);
  const roi = calculateROI(totalExpenditure, totalResults);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{report.reportTypeName}</CardTitle>
              <ReportStatusBadge status={report.status} />
            </div>
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              {periodLabel}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {report.content.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {report.content.summary}
          </p>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Expenditure</p>
            <p className="text-sm font-semibold">
              PHP {totalExpenditure.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Results</p>
            <p className="text-sm font-semibold">
              PHP {totalResults.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">ROI</p>
            <div className="flex items-center gap-1">
              {roi > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : roi < 0 ? (
                <TrendingDown className="h-3 w-3 text-red-600" />
              ) : null}
              <p
                className={cn(
                  'text-sm font-semibold',
                  roi > 0 && 'text-green-600',
                  roi < 0 && 'text-red-600'
                )}
              >
                {roi.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {report.filePaths.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            {report.filePaths.length} attachment{report.filePaths.length > 1 ? 's' : ''}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          {report.status === 'draft' && (
            <span>Last edited: {formatDate(report.updatedAt)}</span>
          )}
          {report.status === 'submitted' && report.submittedAt && (
            <span>Submitted: {formatDate(report.submittedAt)}</span>
          )}
          {report.status === 'reviewed' && report.reviewedAt && (
            <span>Reviewed: {formatDate(report.reviewedAt)}</span>
          )}
        </div>

        {showActions && (
          <div className="flex gap-2">
            {report.status === 'draft' && onEdit && (
              <>
                <Button variant="outline" size="sm" onClick={() => onEdit(report)}>
                  Edit
                </Button>
                {onSubmit && (
                  <Button variant="default" size="sm" onClick={() => onSubmit(report)}>
                    Submit
                  </Button>
                )}
              </>
            )}
            {report.status !== 'draft' && onView && (
              <Button variant="outline" size="sm" onClick={() => onView(report)}>
                View
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

interface ReportListProps {
  reports: ReportSubmission[];
  onView?: (report: ReportSubmission) => void;
  onEdit?: (report: ReportSubmission) => void;
  onSubmit?: (report: ReportSubmission) => void;
  className?: string;
  emptyMessage?: string;
}

export function ReportList({
  reports,
  onView,
  onEdit,
  onSubmit,
  className,
  emptyMessage = 'No reports found.',
}: ReportListProps): React.ReactNode {
  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4', className)}>
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          {...(onView && { onView })}
          {...(onEdit && { onEdit })}
          {...(onSubmit && { onSubmit })}
        />
      ))}
    </div>
  );
}
