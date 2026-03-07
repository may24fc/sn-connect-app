'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { useReport } from '@/hooks/useReport';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate, formatDateTime, formatLabel } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  InsightsSummary,
  type KeyFinding,
  MetricKPICard,
  MetricKPICardGrid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@hr-portal/ui';
import { ArrowLeft, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';

const statusVariant: Record<
  'draft' | 'submitted' | 'approved' | 'rejected',
  'secondary' | 'pending' | 'approved' | 'error'
> = {
  draft: 'secondary',
  submitted: 'pending',
  approved: 'approved',
  rejected: 'error',
};

const KPI_COLORS: Array<'blue' | 'green' | 'orange' | 'red'> = ['blue', 'green', 'orange', 'red'];

export default function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = useReport(id);
  const [actionNotes, setActionNotes] = useState('');
  const [workingAction, setWorkingAction] = useState<string | null>(null);

  const report = data?.data;

  const handleAction = async (action: 'approved' | 'rejected'): Promise<void> => {
    if (!report) return;
    setWorkingAction(action);
    try {
      await fetch(`/api/reports/${report.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: actionNotes || undefined }),
      });
      // Reload to reflect updated status
      window.location.reload();
    } finally {
      setWorkingAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/reports">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Reports
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            Failed to load report. Please try again.
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = report.report_metrics || [];

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({ initialColumn: 'metric_name' });

  const sortedMetrics = sortItems(metrics, {
    metric_name: (m) => m.metric_name,
    metric_value: (m) => m.metric_value,
    metric_unit: (m) => m.metric_unit ?? '',
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  // Build KPI cards from metrics
  const kpiCards = metrics.slice(0, 4).map((metric, index) => ({
    label: metric.metric_name,
    value: metric.metric_unit
      ? `${metric.metric_unit} ${metric.metric_value.toLocaleString()}`
      : metric.metric_value.toLocaleString(),
    change: {
      absolute: metric.notes || '\u2014',
      trend: 'stable' as const,
    },
    color: KPI_COLORS[index % KPI_COLORS.length] ?? 'blue',
  }));

  // Parse accomplishments, challenges, next-week plans from notes
  const noteSections = parseNoteSections(report.notes || '');

  const keyFindings: Array<KeyFinding> = noteSections.accomplishments.map((item, index) => ({
    metric: `Accomplishment ${index + 1}`,
    insight: item,
    highlight: index === 0,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/reports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-headline">{report.report_type}</h1>
            <p className="text-muted-foreground">
              {formatDate(report.period_start)} – {formatDate(report.period_end)}
            </p>
          </div>
        </div>
        <Badge variant={statusVariant[report.status]}>{formatLabel(report.status)}</Badge>
      </div>

      {/* KPI Summary Cards */}
      {kpiCards.length > 0 && (
        <MetricKPICardGrid>
          {kpiCards.map((kpi) => (
            <MetricKPICard key={kpi.label} {...kpi} />
          ))}
        </MetricKPICardGrid>
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Employee:</span>{' '}
            {report.employees
              ? `${report.employees.first_name} ${report.employees.last_name}`
              : '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Department:</span>{' '}
            {report.employees?.department || '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Submitted At:</span>{' '}
            {formatDateTime(report.submitted_at)}
          </p>
          {noteSections.summary && (
            <p>
              <span className="text-muted-foreground">Notes:</span> {noteSections.summary}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Insights Section */}
      {(keyFindings.length > 0 || noteSections.nextWeekPlans.length > 0) && (
        <InsightsSummary
          title="Report Insights"
          summary={
            noteSections.summary ||
            `${report.report_type} report for ${report.period_start} to ${report.period_end}`
          }
          keyFindings={keyFindings}
          recommendations={
            noteSections.challenges.length > 0
              ? noteSections.challenges.map((c) => `Challenge: ${c}`)
              : []
          }
        />
      )}

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead column="metric_name" {...sortHeadProps}>Metric</SortableTableHead>
                <SortableTableHead column="metric_value" {...sortHeadProps}>Value</SortableTableHead>
                <SortableTableHead column="metric_unit" {...sortHeadProps}>Unit</SortableTableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No metrics attached.
                  </TableCell>
                </TableRow>
              ) : (
                sortedMetrics.map((metric) => (
                  <TableRow key={metric.id}>
                    <TableCell className="font-medium">{metric.metric_name}</TableCell>
                    <TableCell className="font-mono">
                      {metric.metric_value.toLocaleString()}
                    </TableCell>
                    <TableCell>{metric.metric_unit || '—'}</TableCell>
                    <TableCell>{metric.notes || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Next Steps */}
      {noteSections.nextWeekPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {noteSections.nextWeekPlans.map((plan, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-indigo-600 font-bold mt-0.5 flex-shrink-0">
                    {index + 1}.
                  </span>
                  <span>{plan}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Admin Action Section */}
      {report.status === 'submitted' && (
        <Card>
          <CardHeader>
            <CardTitle>Review Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="action-notes"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Notes (optional)
              </label>
              <Textarea
                id="action-notes"
                rows={3}
                placeholder="Add review notes..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={workingAction !== null}
                onClick={() => handleAction('approved')}
              >
                {workingAction === 'approved' ? 'Approving...' : 'Approve'}
              </Button>
              <Button
                variant="destructive"
                disabled={workingAction !== null}
                onClick={() => handleAction('rejected')}
              >
                {workingAction === 'rejected' ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show review info if already reviewed */}
      {(report.status === 'approved' || report.status === 'rejected') && (
        <Card>
          <CardHeader>
            <CardTitle>Review Decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Decision:</span>{' '}
              <Badge variant={statusVariant[report.status]}>{formatLabel(report.status)}</Badge>
            </p>
            {report.reviewed_at && (
              <p>
                <span className="text-muted-foreground">Reviewed At:</span>{' '}
                {formatDateTime(report.reviewed_at)}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Parse structured sections from report notes.
 * Supports sections marked with headers like "Accomplishments:", "Challenges:", "Next Week Plans:"
 */
function parseNoteSections(notes: string): {
  summary: string;
  accomplishments: Array<string>;
  challenges: Array<string>;
  nextWeekPlans: Array<string>;
} {
  const result = {
    summary: '',
    accomplishments: [] as Array<string>,
    challenges: [] as Array<string>,
    nextWeekPlans: [] as Array<string>,
  };

  if (!notes) return result;

  const sections = notes.split(/\n(?=(?:accomplishments|challenges|next\s*week\s*plans):)/i);

  for (const section of sections) {
    const trimmed = section.trim();
    if (/^accomplishments:/i.test(trimmed)) {
      result.accomplishments = parseListItems(trimmed.replace(/^accomplishments:\s*/i, ''));
    } else if (/^challenges:/i.test(trimmed)) {
      result.challenges = parseListItems(trimmed.replace(/^challenges:\s*/i, ''));
    } else if (/^next\s*week\s*plans:/i.test(trimmed)) {
      result.nextWeekPlans = parseListItems(trimmed.replace(/^next\s*week\s*plans:\s*/i, ''));
    } else if (!result.summary) {
      result.summary = trimmed;
    }
  }

  // If no structured sections found, use the whole thing as summary
  if (!result.summary && result.accomplishments.length === 0) {
    result.summary = notes;
  }

  return result;
}

function parseListItems(text: string): Array<string> {
  return text
    .split(/\n/)
    .map((line) => line.replace(/^[-*\u2022]\s*/, '').trim())
    .filter(Boolean);
}
