'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { MarketingReportsAccessState } from '@/components/reports/MarketingReportsAccessState';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { useDeleteReport } from '@/hooks/useDeleteReport';
import { useMarketingReportsAccess } from '@/hooks/useMarketingReportsAccess';
import { useReport } from '@/hooks/useReport';
import { useSubmitReport } from '@/hooks/useSubmitReport';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate, formatDateTime, formatLabel } from '@/lib/format';
import {
  formatMetricValue,
  formatMetricValueWithUnit,
  formatUsdAmount,
  getContentCreationEntries,
  getContentCreationObservations,
  getContentCreationResults,
  getMarketingCampaignTypeLabel,
  getMarketingObjectiveLabel,
  getMarketingReportDisplayName,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { AlertCircle, ArrowLeft, BarChart3, ListChecks, Loader2, Pencil, Send, TableIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

function getSubmittedTimestamp(report: {
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string | null;
  reviewed_at: string | null;
  updated_at: string;
}): string | null {
  if (report.submitted_at) {
    return report.submitted_at;
  }

  if (report.status !== 'draft') {
    return report.reviewed_at ?? report.updated_at;
  }

  return null;
}

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { addToast } = useToast();
  const { id } = use(params);
  const router = useRouter();
  const handleBack = useBackNavigation({ fallbackPath: '/reports' });
  const marketingAccess = useMarketingReportsAccess();
  const { data, isLoading, error } = useReport(id);
  const submitReport = useSubmitReport();
  const deleteReport = useDeleteReport();

  const [metricsView, setMetricsView] = useState<'table' | 'chart'>('table');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const report = data?.data;
  const metrics = report?.report_metrics || [];
  const marketingContext = report?.marketing_context;
  const submittedTimestamp = report ? getSubmittedTimestamp(report) : null;
  const contentCreationEntries = getContentCreationEntries(marketingContext, metrics);
  const isContentCreationReport = marketingContext?.marketingReportType === 'Content Creation';

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({
    initialColumn: 'metric_name',
  });

  const sortedMetrics = sortItems(metrics, {
    metric_name: (m) => m.metric_name,
    metric_value: (m) => m.metric_value,
    metric_unit: (m) => m.metric_unit ?? '',
  });

  const sortedContentCreationEntries = sortItems(contentCreationEntries, {
    metric_name: (entry) => entry.platform.toLowerCase(),
    metric_value: (entry) => entry.posts,
    metric_unit: () => 'count',
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

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

  const contentCreationKpiCards = contentCreationEntries.slice(0, 4).map((entry, index) => ({
    label: entry.platform,
    value: formatMetricValueWithUnit(entry.posts, 'count'),
    change: {
      absolute: '—',
      trend: 'stable' as const,
    },
    color: KPI_COLORS[index % KPI_COLORS.length] as 'blue' | 'green' | 'orange' | 'red',
  }));

  const metricKpiCards = metrics.slice(0, 4).map((metric, index) => ({
    label: metric.metric_name,
    value: formatMetricValueWithUnit(metric.metric_value, metric.metric_unit),
    change: {
      absolute: metric.notes || '—',
      trend: 'stable' as const,
    },
    color: KPI_COLORS[index % KPI_COLORS.length] as 'blue' | 'green' | 'orange' | 'red',
  }));

  // Build KPI cards from metrics or structured content creation entries
  const kpiCards = isContentCreationReport ? contentCreationKpiCards : metricKpiCards;

  // Parse accomplishments, challenges, next-week plans from notes
  const noteSections = parseNoteSections(report.notes || '');
  const contentCreationObservations = getContentCreationObservations(marketingContext, noteSections);
  const contentCreationResults = getContentCreationResults(marketingContext, noteSections);

  const keyFindings: Array<KeyFinding> = noteSections.accomplishments.map((item, index) => ({
    metric: `Accomplishment ${index + 1}`,
    insight: item,
    highlight: index === 0,
  }));

  const draftLabel = marketingContext
    ? getMarketingReportDisplayName(marketingContext)
    : `${getReportTypeLabel(report.report_type)} report`;

  const handleDeleteDraft = () => {
    deleteReport.mutate(report.id, {
      onSuccess: () => {
        addToast({
          title: 'Draft deleted',
          description: 'The marketing report draft has been removed.',
          variant: 'success',
        });
        setDeleteDialogOpen(false);
        router.push('/reports');
      },
      onError: (deleteError) => {
        addToast({
          title: 'Delete failed',
          description: deleteError.message,
          variant: 'error',
        });
      },
    });
  };

  return (
    <>
      <div className="mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {marketingContext
                ? getMarketingReportDisplayName(marketingContext)
                : `${getReportTypeLabel(report.report_type)} Report`}
            </h1>
            <p className="text-muted-foreground">
              {getReportTypeDescription(report.report_type) && (
                <span className="block text-xs mb-0.5">{getReportTypeDescription(report.report_type)}</span>
              )}
              {marketingContext?.primaryChannel && marketingContext.objective && (
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
            <>
              <Button variant="outline" asChild>
                <Link href={`/reports/${report.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Draft
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-rose-600 hover:text-rose-700"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleteReport.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Draft
              </Button>
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
                    onError: (submitError) => {
                      addToast({
                        title: 'Submission failed',
                        description: submitError.message,
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
            </>
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
                  description: submittedTimestamp ? formatDateTime(submittedTimestamp) : undefined,
                  status: report.status === 'draft' ? 'current' : 'completed',
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
            {submittedTimestamp ? formatDateTime(submittedTimestamp) : '—'}
          </p>
          <div className="space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-muted-foreground">
              {isContentCreationReport ? 'Brief Notes / Observations' : 'Campaign Summary'}
            </p>
            <p className="whitespace-pre-wrap text-foreground">
              {(isContentCreationReport ? contentCreationObservations : noteSections.summary) || (isContentCreationReport
                ? 'No observations were provided for this report.'
                : 'No campaign summary was provided for this report.')}
            </p>
          </div>
          {isContentCreationReport ? (
            <div className="space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-muted-foreground">Results</p>
              <p className="whitespace-pre-wrap text-foreground">
                {contentCreationResults || 'No results were provided for this report.'}
              </p>
            </div>
          ) : null}
          {report.review_notes && (
            <p>
              <span className="text-muted-foreground">Review Notes:</span> {report.review_notes}
            </p>
          )}
        </CardContent>
      </Card>

      {marketingContext && (
        <Card>
          <CardHeader>
            <CardTitle>{isContentCreationReport ? 'Report Context' : 'Campaign Context'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            {marketingContext.campaignType ? (
              <p>
                <span className="text-muted-foreground">Campaign Type:</span>{' '}
                {getMarketingCampaignTypeLabel(marketingContext.campaignType)}
              </p>
            ) : null}
            {marketingContext.objective ? (
              <p>
                <span className="text-muted-foreground">Objective:</span>{' '}
                {getMarketingObjectiveLabel(marketingContext.objective)}
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">Total Spend:</span>{' '}
              {formatUsdAmount(marketingContext.totalSpend ?? 0)}
            </p>
            {marketingContext.primaryChannel ? (
              <p>
                <span className="text-muted-foreground">Primary Channel:</span>{' '}
                {marketingContext.primaryChannel}
              </p>
            ) : null}
            {marketingContext.targetAudience ? (
              <p>
                <span className="text-muted-foreground">Target Audience:</span>{' '}
                {marketingContext.targetAudience}
              </p>
            ) : null}
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
            <CardTitle>{isContentCreationReport ? 'Contents Published' : 'Metrics'}</CardTitle>
            {(isContentCreationReport ? contentCreationEntries.length : metrics.length) > 0 && (
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
        {metricsView === 'chart' && (isContentCreationReport ? contentCreationEntries.length : metrics.length) > 0 ? (
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <ReportMetricsChart
                data={isContentCreationReport
                  ? contentCreationEntries.map((entry) => ({ name: entry.platform, value: entry.posts, unit: 'count' }))
                  : metrics.map((m) => ({ name: m.metric_name, value: m.metric_value, unit: m.metric_unit }))}
                chartType="bar"
                title="Bar Chart"
                description={isContentCreationReport ? 'Published post count by platform' : 'Metric values comparison'}
              />
              <ReportMetricsChart
                data={isContentCreationReport
                  ? contentCreationEntries.map((entry) => ({ name: entry.platform, value: entry.posts, unit: 'count' }))
                  : metrics.map((m) => ({ name: m.metric_name, value: m.metric_value, unit: m.metric_unit }))}
                chartType="pie"
                title="Distribution"
                description={isContentCreationReport ? 'Publishing mix by platform' : 'Metric value distribution'}
              />
            </div>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="metric_name" {...sortHeadProps}>
                    {isContentCreationReport ? 'Platform / App' : 'Metric'}
                  </SortableTableHead>
                  <SortableTableHead column="metric_value" {...sortHeadProps}>
                    {isContentCreationReport ? 'Posts' : 'Value'}
                  </SortableTableHead>
                  {isContentCreationReport ? null : <SortableTableHead column="metric_unit" {...sortHeadProps}>Unit</SortableTableHead>}
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isContentCreationReport ? contentCreationEntries.length : metrics.length) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isContentCreationReport ? 3 : 4} className="text-center text-muted-foreground">
                      {isContentCreationReport ? 'No publishing entries were attached.' : 'No metrics attached.'}
                    </TableCell>
                  </TableRow>
                ) : isContentCreationReport ? (
                  sortedContentCreationEntries.map((entry) => (
                    <TableRow key={entry.platform}>
                      <TableCell className="font-medium">{entry.platform}</TableCell>
                      <TableCell className="font-mono">{formatMetricValue(entry.posts, 'count')}</TableCell>
                      <TableCell>—</TableCell>
                    </TableRow>
                  ))
                ) : (
                  sortedMetrics.map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell className="font-medium">{metric.metric_name}</TableCell>
                      <TableCell className="font-mono">
                        {formatMetricValue(metric.metric_value, metric.metric_unit)}
                      </TableCell>
                      {isContentCreationReport ? null : <TableCell>{metric.metric_unit || '—'}</TableCell>}
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete draft report?</DialogTitle>
            <DialogDescription>
              This will permanently remove {draftLabel}. Once deleted, the draft cannot be recovered from this page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={deleteReport.isPending}
              onClick={handleDeleteDraft}
            >
              {deleteReport.isPending ? 'Deleting...' : 'Delete Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
