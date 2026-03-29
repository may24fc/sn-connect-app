'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { MarketingReportsAccessState } from '@/components/reports/MarketingReportsAccessState';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { useMarketingReportsAccess } from '@/hooks/useMarketingReportsAccess';
import { useReport } from '@/hooks/useReport';
import { useSubmitReport } from '@/hooks/useSubmitReport';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate, formatDateTime, formatLabel } from '@/lib/format';
import {
  getMarketingCampaignTypeLabel,
  getMarketingObjectiveLabel,
  getReportTypeDescription,
  getReportTypeLabel,
  parseNoteSections,
} from '@/lib/report-utils';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  InsightsSummary,
  type KeyFinding,
  MetricKPICard,
  MetricKPICardGrid,
  ProgressTimeline,
  ReportMetricsChart,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@hr-portal/ui';
import type { ProgressTimelineStep } from '@hr-portal/ui';
import { AlertCircle, ArrowLeft, BarChart3, ListChecks, Loader2, Send, TableIcon } from 'lucide-react';
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

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { addToast } = useToast();
  const { id } = use(params);
  const handleBack = useBackNavigation({ fallbackPath: '/reports' });
  const marketingAccess = useMarketingReportsAccess();
  const { data, isLoading, error } = useReport(id);
  const submitReport = useSubmitReport();

  const [metricsView, setMetricsView] = useState<'table' | 'chart'>('table');

  const report = data?.data;

  if (marketingAccess.isLoading) {
    return (
      <div className="mx-auto max-w-4xl py-6">
        <EmptyState
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          title="Loading marketing report"
          description="Marketing access and report context are still loading."
          size="sm"
        />
      </div>
    );
  }

  if (!marketingAccess.canAccess) {
    return (
      <MarketingReportsAccessState
        reason={marketingAccess.reason}
        fallbackHref={marketingAccess.user?.role === 'intern' ? '/intern/dashboard' : '/dashboard'}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl py-6">
        <EmptyState
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          title="Loading report"
          description="Report details are still loading."
          size="sm"
        />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Reports
        </Button>
        <Card>
          <CardContent>
            <EmptyState
              icon={AlertCircle}
              title={
                error?.message?.includes('permission') || error?.message?.includes('403')
                  ? 'You do not have permission to view this report'
                  : 'Failed to load report'
              }
              description={
                error?.message?.includes('permission') || error?.message?.includes('403')
                  ? 'Your account does not have access to this report.'
                  : 'Refresh and try again to load this report.'
              }
              size="sm"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = report.report_metrics || [];
  const marketingContext = report.marketing_context;

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
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {marketingContext?.campaignName || `${getReportTypeLabel(report.report_type)} Report`}
            </h1>
            <p className="text-muted-foreground">
              {getReportTypeDescription(report.report_type) && (
                <span className="block text-xs mb-0.5">{getReportTypeDescription(report.report_type)}</span>
              )}
              {marketingContext && (
                <span className="block text-xs mb-0.5">
                  {getMarketingObjectiveLabel(marketingContext.objective)} objective via {marketingContext.primaryChannel}
                </span>
              )}
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
              <Send className="mr-2 h-4 w-4" />
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

      {/* Report Progress Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressTimeline
            steps={(() => {
              const isRejected = report.status === 'rejected';
              const steps: ProgressTimelineStep[] = [
                {
                  label: 'Created',
                  description: formatDateTime(report.created_at),
                  status: 'completed',
                },
                {
                  label: 'Submitted',
                  description: report.submitted_at ? formatDateTime(report.submitted_at) : undefined,
                  status: report.submitted_at ? 'completed'
                    : report.status === 'draft' ? 'current' : 'upcoming',
                },
                {
                  label: isRejected ? 'Rejected' : 'Approved',
                  description: report.reviewed_at ? formatDateTime(report.reviewed_at) : undefined,
                  status: report.reviewed_at ? 'completed'
                    : report.status === 'submitted' ? 'current' : 'upcoming',
                },
              ];
              return steps;
            })()}
          />
        </CardContent>
      </Card>

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

      {marketingContext && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Context</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Campaign Type:</span>{' '}
              {getMarketingCampaignTypeLabel(marketingContext.campaignType)}
            </p>
            <p>
              <span className="text-muted-foreground">Objective:</span>{' '}
              {getMarketingObjectiveLabel(marketingContext.objective)}
            </p>
            <p>
              <span className="text-muted-foreground">Primary Channel:</span>{' '}
              {marketingContext.primaryChannel}
            </p>
            <p>
              <span className="text-muted-foreground">Target Audience:</span>{' '}
              {marketingContext.targetAudience}
            </p>
          </CardContent>
        </Card>
      )}

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

      {/* Metrics Table / Chart Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Metrics</CardTitle>
            {metrics.length > 0 && (
              <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setMetricsView('table')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    metricsView === 'table'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setMetricsView('chart')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    metricsView === 'chart'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Chart
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        {metricsView === 'chart' && metrics.length > 0 ? (
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <ReportMetricsChart
                data={metrics.map((m) => ({ name: m.metric_name, value: m.metric_value, unit: m.metric_unit }))}
                chartType="bar"
                title="Bar Chart"
                description="Metric values comparison"
              />
              <ReportMetricsChart
                data={metrics.map((m) => ({ name: m.metric_name, value: m.metric_value, unit: m.metric_unit }))}
                chartType="pie"
                title="Distribution"
                description="Metric value distribution"
              />
            </div>
          </CardContent>
        ) : (
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
        )}
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
                  <span className="text-slate-700 font-bold mt-0.5 flex-shrink-0">
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
