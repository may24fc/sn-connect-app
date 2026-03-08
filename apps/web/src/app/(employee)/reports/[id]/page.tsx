'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { useReport } from '@/hooks/useReport';
import { useSubmitReport } from '@/hooks/useSubmitReport';
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
  useToast,
} from '@hr-portal/ui';
import { ArrowLeft, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

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

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { addToast } = useToast();
  const { id } = use(params);
  const { data, isLoading, error } = useReport(id);
  const submitReport = useSubmitReport();

  const report = data?.data;

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading report...</div>;
  }

  if (error || !report) {
    return <div className="text-sm text-error">Failed to load report.</div>;
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
      absolute: metric.notes || '—',
      trend: 'stable' as const,
    },
    color: KPI_COLORS[index % KPI_COLORS.length] as 'blue' | 'green' | 'orange' | 'red',
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/reports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{report.report_type}</h1>
            <p className="text-muted-foreground">
              {formatDate(report.period_start)} – {formatDate(report.period_end)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant[report.status]}>{formatLabel(report.status)}</Badge>
          {report.status === 'draft' && (
            <Button
              onClick={() =>
                submitReport.mutate(report.id, {
                  onSuccess: () => {
                    addToast({
                      title: 'Report submitted',
                      description: `${report.report_type} report has been submitted for review`,
                      variant: 'success',
                    });
                  },
                  onError: () => {
                    addToast({
                      title: 'Error',
                      description: 'Failed to submit report',
                      variant: 'error',
                    });
                  },
                })
              }
              disabled={submitReport.isPending}
            >
              Submit
            </Button>
          )}
        </div>
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
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
}
