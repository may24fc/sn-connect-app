'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { useReport } from '@/hooks/useReport';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate, formatDateTime, formatLabel } from '@/lib/format';
import {
  formatUsdAmount,
  formatMetricValue,
  formatMetricValueWithUnit,
  getContentCreationEntries,
  getContentCreationObservations,
  getContentCreationResults,
  getMarketingCampaignTypeLabel,
  getMarketingObjectiveSummaryLabel,
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
  EmptyState,
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
import { useToast } from '@hr-portal/ui';
import { AlertCircle, ArrowLeft, CheckCircle2, ListChecks } from 'lucide-react';
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

export default function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const handleBack = useBackNavigation({ fallbackPath: '/admin/reports' });
  const { data, isLoading, error } = useReport(id);
  const [actionNotes, setActionNotes] = useState('');
  const [workingAction, setWorkingAction] = useState<string | null>(null);
  const { addToast } = useToast();

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

  const handleAction = async (action: 'approved' | 'rejected'): Promise<void> => {
    if (!report) return;
    setWorkingAction(action);
    try {
      const res = await fetch(`/api/reports/${report.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: actionNotes || undefined }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Request failed');
      }
      addToast({ title: `Report ${action}`, variant: 'success' });
      window.location.reload();
    } catch (error) {
      addToast({
        title:
          error instanceof Error
            ? error.message
            : `Failed to ${action === 'approved' ? 'approve' : 'reject'} report`,
        variant: 'error',
      });
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
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Marketing Reports
        </Button>
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Failed to load report"
              description="This marketing report could not be retrieved. Go back or refresh and try again."
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
      absolute: '\u2014',
      trend: 'stable' as const,
    },
    color: KPI_COLORS[index % KPI_COLORS.length] ?? 'blue',
  }));

  const metricKpiCards = metrics.slice(0, 4).map((metric, index) => ({
    label: metric.metric_name,
    value: formatMetricValueWithUnit(metric.metric_value, metric.metric_unit),
    change: {
      absolute: metric.notes || '\u2014',
      trend: 'stable' as const,
    },
    color: KPI_COLORS[index % KPI_COLORS.length] ?? 'blue',
  }));

  // Build KPI cards from metrics or structured content creation entries
  const kpiCards = isContentCreationReport ? contentCreationKpiCards : metricKpiCards;

  // Parse accomplishments, challenges, next-week plans from notes
  const noteSections = parseNoteSections(report.notes || '');
  const contentCreationObservations = getContentCreationObservations(marketingContext, noteSections);
  const contentCreationResults = getContentCreationResults(marketingContext, noteSections);
  const objectiveSummaryLabel = getMarketingObjectiveSummaryLabel(marketingContext);
  const objectiveFieldLabel = (marketingContext?.objectives?.length ?? 0) > 1 ? 'Objectives' : 'Objective';

  const keyFindings: Array<KeyFinding> = noteSections.accomplishments.map((item, index) => ({
    metric: `Accomplishment ${index + 1}`,
    insight: item,
    highlight: index === 0,
  }));

  return (
    <div className="mx-auto space-y-6">
      {/* Header */}
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
            <span className="text-muted-foreground">Team:</span> Marketing
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
            {objectiveSummaryLabel ? (
              <p>
                <span className="text-muted-foreground">{objectiveFieldLabel}:</span>{' '}
                {objectiveSummaryLabel}
              </p>
            ) : null}
            {isContentCreationReport ? null : (
              <p>
                <span className="text-muted-foreground">Total Spend:</span>{' '}
                {formatUsdAmount(marketingContext.totalSpend ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Insights Section */}
      {(keyFindings.length > 0 || noteSections.nextWeekPlans.length > 0) && (
        <InsightsSummary
          title="Report Insights"
          summary={
            noteSections.summary ||
            `Marketing report for ${report.period_start} to ${report.period_end}`
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
          <CardTitle>{isContentCreationReport ? 'Contents Published' : 'Metrics'}</CardTitle>
        </CardHeader>
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
                variant="success"
                disabled={workingAction !== null}
                onClick={() => handleAction('approved')}
              >
                <CheckCircle2 className="h-4 w-4" />
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
            {report.review_notes && (
              <p>
                <span className="text-muted-foreground">Review Notes:</span>{' '}
                {report.review_notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
