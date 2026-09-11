'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { MarketingContentImagePreview } from '@/components/reports/MarketingContentImagePreview';
import { useDeleteReport } from '@/hooks/useDeleteReport';
import { useRestoreReport } from '@/hooks/useRestoreReport';
import { type ReportRecord, useReports } from '@/hooks/useReports';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate, formatLabel } from '@/lib/format';
import {
  getMarketingCampaignTypeLabel,
  getMarketingObjectiveSummaryLabel,
  getMarketingReportContextSummary,
  getMarketingReportDisplayName,
  getContentCreationEntries,
  getContentCreationObservations,
  getContentCreationResults,
  isMarketingWeeklyPlan,
  matchesMarketingReportFilters,
  parseNoteSections,
  type MarketingCampaignFilterValue,
  type MarketingObjectiveFilterValue,
  type MarketingReportTypeFilterValue,
} from '@/lib/report-utils';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ToggleGroup,
} from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import { AlertCircle, ArchiveRestore, CheckCircle2, ChevronLeft, ChevronRight, Eye, Loader2, MoreHorizontal, Search, Trash2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type ReportReviewFilter = 'all' | 'submitted' | 'approved' | 'rejected' | 'archived';
type SubmissionView = 'table' | 'latest';

const statusVariant: Record<
  'draft' | 'submitted' | 'approved' | 'rejected',
  'secondary' | 'pending' | 'approved' | 'error'
> = {
  draft: 'secondary',
  submitted: 'pending',
  approved: 'approved',
  rejected: 'error',
};

interface ReportsSubmissionsTabProps {
  department: string;
  reportType: MarketingReportTypeFilterValue;
  campaignType: MarketingCampaignFilterValue;
  objective: MarketingObjectiveFilterValue;
  customStartDate?: string;
  customEndDate?: string;
}

export function ReportsSubmissionsTab({
  department,
  reportType,
  campaignType,
  objective,
  customStartDate,
  customEndDate,
}: ReportsSubmissionsTabProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ReportReviewFilter>('all');
  const [view, setView] = useState<SubmissionView>('latest');
  const [latestReportIndex, setLatestReportIndex] = useState(0);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [reportPendingDelete, setReportPendingDelete] = useState<ReportRecord | null>(null);
  const archivedView = status === 'archived';
  const { addToast } = useToast();
  const router = useRouter();
  const deleteReport = useDeleteReport();
  const restoreReport = useRestoreReport();

  const filters = {
    ...(status !== 'all' && status !== 'archived'
      ? { status: status as 'draft' | 'submitted' | 'approved' | 'rejected' }
      : {}),
    archived: archivedView ? 'only' as const : 'exclude' as const,
    ...(department !== 'all' ? { department } : {}),
    reportType: 'marketing' as const,
    ...(reportType !== 'all' ? { marketingReportType: reportType } : {}),
    ...(customStartDate && customEndDate
      ? { periodOverlapStart: customStartDate, periodOverlapEnd: customEndDate }
      : {}),
    page: 1,
    pageSize: 500,
  };

  const { data, isLoading, error, refetch } = useReports(filters);

  const reports = useMemo(() => {
    let all = data?.data || [];

    if (!archivedView) {
      all = all.filter((report) => report.status !== 'draft');
    }

    all = all.filter((report) =>
      !isMarketingWeeklyPlan(report.marketing_context) &&
      matchesMarketingReportFilters(report, {
        reportType,
        campaignType,
        objective,
        search,
      })
    );
    return all;
  }, [archivedView, campaignType, data?.data, objective, reportType, search]);

  const reportStatusOrder: Record<string, number> = { submitted: 0, rejected: 1, approved: 2 };

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({ initialColumn: 'period', initialDirection: 'desc' });

  const sortedReports = sortItems(reports, {
    employee: (r) => r.employees ? `${r.employees.first_name} ${r.employees.last_name}`.toLowerCase() : '',
    campaign: (r) => getMarketingReportDisplayName(r.marketing_context).toLowerCase(),
    campaignType: (r) =>
      r.marketing_context?.campaignType
        ? getMarketingCampaignTypeLabel(r.marketing_context.campaignType).toLowerCase()
        : '',
    goal: (r) =>
      getMarketingObjectiveSummaryLabel(r.marketing_context)
        ? getMarketingObjectiveSummaryLabel(r.marketing_context)?.toLowerCase() ?? ''
        : '',
    status: (r) => reportStatusOrder[r.status] ?? 99,
    period: (r) => r.period_start ?? '',
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  const latestFirstReports = useMemo(
    () => [...reports].sort((first, second) => (second.period_start ?? '').localeCompare(first.period_start ?? '')),
    [reports]
  );
  const selectedLatestReport = latestFirstReports[latestReportIndex] ?? null;

  useEffect(() => {
    setLatestReportIndex(0);
  }, [archivedView, campaignType, customEndDate, customStartDate, department, objective, reportType, search, status]);

  const stats = useMemo(() => {
    const submitted = reports.filter((report) => report.status === 'submitted').length;
    const approved = reports.filter((report) => report.status === 'approved').length;
    const rejected = reports.filter((report) => report.status === 'rejected').length;
    return { submitted, approved, rejected, total: reports.length };
  }, [reports]);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setWorkingId(id);
    try {
      const res = await fetch(`/api/reports/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Request failed');
      }
      addToast({ title: `Report ${action}`, variant: 'success' });
      await refetch();
    } catch (error) {
      addToast({
        title:
          error instanceof Error
            ? error.message
            : `Failed to ${action === 'approved' ? 'approve' : 'reject'} report`,
        variant: 'error',
      });
    } finally {
      setWorkingId(null);
    }
  };

  const pendingReportLabel = reportPendingDelete
    ? getMarketingReportDisplayName(reportPendingDelete.marketing_context)
    : 'this report';

  const handleDeleteReport = () => {
    if (!reportPendingDelete) {
      return;
    }

    deleteReport.mutate(reportPendingDelete.id, {
      onSuccess: () => {
        addToast({
          title: 'Report archived',
          description: 'The marketing report has been archived.',
          variant: 'success',
        });
        setReportPendingDelete(null);
      },
      onError: (deleteError) => {
        addToast({
          title: 'Archive failed',
          description: deleteError.message,
          variant: 'error',
        });
      },
    });
  };

  const handleRestoreReport = (reportId: string) => {
    restoreReport.mutate(reportId, {
      onSuccess: () => {
        addToast({
          title: 'Report restored',
          description: 'The marketing report is back in the active submissions list.',
          variant: 'success',
        });
      },
      onError: (restoreError) => {
        addToast({
          title: 'Restore failed',
          description: restoreError.message,
          variant: 'error',
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Visible Reports</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="text-2xl font-bold">{stats.submitted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            placeholder="Search employee, campaign, channel, audience, or notes"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as ReportReviewFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Review Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <ToggleGroup
          value={view}
          onChange={(value) => setView(value as SubmissionView)}
          options={[
            { value: 'table', label: 'Table' },
            { value: 'latest', label: 'Latest first' },
          ]}
        />
      </div>

      {/* Results */}
      {isLoading || (view === 'latest' && !error) ? (
        view === 'latest' && !isLoading ? (
          selectedLatestReport ? (
            <Card>
              <CardContent className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Report {latestReportIndex + 1} of {latestFirstReports.length}
                    </p>
                    <h2 className="text-xl font-semibold text-foreground">
                      {getMarketingReportDisplayName(selectedLatestReport.marketing_context)}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedLatestReport.period_start)} - {formatDate(selectedLatestReport.period_end)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[selectedLatestReport.status]}>
                      {formatLabel(selectedLatestReport.status)}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/reports/${selectedLatestReport.id}`}>
                        <Eye className="mr-1.5 h-4 w-4" />
                        Open
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Submission details</h3>
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Employee</dt>
                        <dd className="font-medium text-foreground">
                          {selectedLatestReport.employees
                            ? `${selectedLatestReport.employees.first_name} ${selectedLatestReport.employees.last_name}`
                            : '-'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Report type</dt>
                        <dd className="font-medium text-foreground">
                          {getMarketingReportContextSummary(selectedLatestReport.marketing_context)}
                        </dd>
                      </div>
                      {selectedLatestReport.marketing_context?.campaignType ? (
                        <div>
                          <dt className="text-muted-foreground">Campaign type</dt>
                          <dd className="font-medium text-foreground">
                            {getMarketingCampaignTypeLabel(selectedLatestReport.marketing_context.campaignType)}
                          </dd>
                        </div>
                      ) : null}
                      {getMarketingObjectiveSummaryLabel(selectedLatestReport.marketing_context) ? (
                        <div>
                          <dt className="text-muted-foreground">Goal</dt>
                          <dd className="font-medium text-foreground">
                            {getMarketingObjectiveSummaryLabel(selectedLatestReport.marketing_context)}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Report narrative</h3>
                    <div className="space-y-3 text-sm">
                      {(() => {
                        const noteSections = parseNoteSections(selectedLatestReport.notes || '');
                        const isOrganicCreation = selectedLatestReport.marketing_context?.marketingReportType === 'Organic Creation';
                        const observations = getContentCreationObservations(selectedLatestReport.marketing_context, noteSections);
                        const results = getContentCreationResults(selectedLatestReport.marketing_context, noteSections);

                        return (
                          <>
                            <div className="rounded-md border bg-muted/20 p-3">
                              <p className="mb-1 text-xs font-medium text-muted-foreground">
                                {isOrganicCreation ? 'Observations' : 'Summary'}
                              </p>
                              <p className="whitespace-pre-wrap text-foreground">
                                {(isOrganicCreation ? observations : noteSections.summary) || 'No narrative was provided.'}
                              </p>
                            </div>
                            {isOrganicCreation ? (
                              <div className="rounded-md border bg-muted/20 p-3">
                                <p className="mb-1 text-xs font-medium text-muted-foreground">Results</p>
                                <p className="whitespace-pre-wrap text-foreground">{results || 'No results were provided.'}</p>
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {(selectedLatestReport.report_metrics?.length ?? 0) > 0 ? (
                  <div className="border-t pt-5">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Metrics</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {(selectedLatestReport.report_metrics ?? []).map((metric) => (
                        <div key={metric.id} className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">{metric.metric_name}</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">
                            {metric.metric_value} {metric.metric_unit ?? ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedLatestReport.marketing_context?.marketingReportType === 'Organic Creation' ? (
                  <div className="border-t pt-5">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Contents Published</h3>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {getContentCreationEntries(
                        selectedLatestReport.marketing_context,
                        selectedLatestReport.report_metrics ?? []
                      ).map((entry, index) => (
                        <div key={`${entry.platform}-${index}`} className="space-y-3 rounded-md border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-foreground">{entry.platform}</p>
                            <p className="text-sm text-muted-foreground">{entry.posts} posts</p>
                          </div>
                          {entry.imagePath ? (
                            <MarketingContentImagePreview
                              imagePath={entry.imagePath}
                              alt={`${entry.platform} published content evidence`}
                              className="h-96"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">No image attached.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between border-t pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={latestReportIndex === 0}
                    onClick={() => setLatestReportIndex((index) => index - 1)}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={latestReportIndex >= latestFirstReports.length - 1}
                    onClick={() => setLatestReportIndex((index) => index + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <EmptyState
                  icon={Search}
                  title={archivedView ? 'No archived marketing reports found' : 'No marketing reports found'}
                  description="Adjust the filters to view a report."
                  size="sm"
                />
              </CardContent>
            </Card>
          )
        ) : (
          <Card>
            <CardContent className="p-6">
              <EmptyState
                icon={<Loader2 className="h-5 w-5 animate-spin" />}
                title="Loading marketing reports"
                description="Retrieving report submissions for the selected filters."
                size="sm"
              />
            </CardContent>
          </Card>
        )
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Failed to load marketing reports"
              description="The submissions list could not be retrieved. Refresh and try again."
              action={{ label: 'Retry', onClick: () => void refetch() }}
              size="sm"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="employee" {...sortHeadProps}>Employee</SortableTableHead>
                  <SortableTableHead column="campaign" {...sortHeadProps}>Campaign</SortableTableHead>
                  <SortableTableHead column="campaignType" {...sortHeadProps}>Campaign Type</SortableTableHead>
                  <SortableTableHead column="goal" {...sortHeadProps}>Goal</SortableTableHead>
                  <SortableTableHead column="status" {...sortHeadProps}>Status</SortableTableHead>
                  <SortableTableHead column="period" {...sortHeadProps}>Period</SortableTableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10">
                      <EmptyState
                        icon={Search}
                        title={archivedView ? 'No archived marketing reports found' : 'No marketing reports found'}
                        description={
                          archivedView
                            ? 'Archived marketing reports will appear here once a report has been archived.'
                            : 'Adjust the filters or wait for submitted reports to appear in this queue.'
                        }
                        size="sm"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedReports.map((report) => (
                    <TableRow
                      key={report.id}
                      className={`${archivedView ? 'cursor-default' : 'cursor-pointer'} hover:bg-muted/50 transition-colors`}
                      onDoubleClick={() => {
                        if (!archivedView) {
                          router.push(`/admin/reports/${report.id}`);
                        }
                      }}
                    >
                      <TableCell>
                        {report.employees
                          ? `${report.employees.first_name} ${report.employees.last_name}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">
                            {getMarketingReportDisplayName(report.marketing_context)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getMarketingReportContextSummary(report.marketing_context)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {report.marketing_context?.campaignType
                          ? getMarketingCampaignTypeLabel(report.marketing_context.campaignType)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {getMarketingObjectiveSummaryLabel(report.marketing_context)
                          ? getMarketingObjectiveSummaryLabel(report.marketing_context)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[report.status]}>
                          {formatLabel(report.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(report.period_start)} – {formatDate(report.period_end)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end" onClick={(event) => event.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                                Manage
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!archivedView && (
                                <>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/reports/${report.id}`}>
                                      <Eye className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                                      View report
                                    </Link>
                                  </DropdownMenuItem>
                                  {report.status === 'submitted' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        disabled={workingId === report.id}
                                        onClick={() => handleAction(report.id, 'approved')}
                                      >
                                        <CheckCircle2 className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                                        Approve report
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        disabled={workingId === report.id}
                                        onClick={() => handleAction(report.id, 'rejected')}
                                      >
                                        <XCircle className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                                        Reject report
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </>
                              )}
                              {archivedView ? (
                                <DropdownMenuItem
                                  disabled={restoreReport.isPending}
                                  onClick={() => handleRestoreReport(report.id)}
                                >
                                  <ArchiveRestore className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                                  Restore report
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    disabled={deleteReport.isPending}
                                    onClick={() => setReportPendingDelete(report)}
                                    className="text-rose-600 focus:text-rose-700"
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                                    Archive report
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        )
      }

      <Dialog open={Boolean(reportPendingDelete)} onOpenChange={(open) => !open && setReportPendingDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive report?</DialogTitle>
            <DialogDescription>
              This will archive {pendingReportLabel}. Archived reports are removed from the submissions queue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReportPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={deleteReport.isPending}
              onClick={handleDeleteReport}
            >
              {deleteReport.isPending ? 'Archiving...' : 'Archive Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
