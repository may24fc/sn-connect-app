'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { MarketingReportsAccessState } from '@/components/reports/MarketingReportsAccessState';
import { useDeleteReport } from '@/hooks/useDeleteReport';
import { useMarketingReportsAccess } from '@/hooks/useMarketingReportsAccess';
import { type ReportRecord, useReports } from '@/hooks/useReports';
import { useRestoreReport } from '@/hooks/useRestoreReport';
import { useSubmitReport } from '@/hooks/useSubmitReport';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate, formatLabel } from '@/lib/format';
import { getMarketingCampaignTypeLabel, getMarketingObjectiveLabel, getReportTypeLabel } from '@/lib/report-utils';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CountBadge,
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
  SectionTooltip,
  HelpLink,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, ArchiveRestore, ChevronDown, ChevronRight, CheckCircle2, Eye, FileText, Layers, List, Loader2, MoreHorizontal, Pencil, Plus, Search, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

type ReportStatusFilter = 'all' | 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived';

const statusVariant: Record<
  'draft' | 'submitted' | 'approved' | 'rejected',
  'secondary' | 'pending' | 'approved' | 'error'
> = {
  draft: 'secondary',
  submitted: 'pending',
  approved: 'approved',
  rejected: 'error',
};

function getSubmittedTimestamp(report: Pick<ReportRecord, 'status' | 'submitted_at' | 'reviewed_at' | 'updated_at'>): string | null {
  if (report.submitted_at) {
    return report.submitted_at;
  }

  if (report.status !== 'draft') {
    return report.reviewed_at ?? report.updated_at;
  }

  return null;
}

export default function ReportsPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const marketingAccess = useMarketingReportsAccess();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ReportStatusFilter>('all');
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [reportPendingDelete, setReportPendingDelete] = useState<ReportRecord | null>(null);
  const archivedView = status === 'archived';

  if (marketingAccess.isLoading) {
    return (
      <EmptyState
        icon={<Loader2 className="h-5 w-5 animate-spin" />}
        title="Loading marketing reports"
        description="Checking your reporting access and loading your latest submissions."
      />
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

  const reportFilters = {
    ...(search ? { search } : {}),
    ...(status !== 'all' && status !== 'archived'
      ? { status: status as 'draft' | 'submitted' | 'approved' | 'rejected' }
      : {}),
    archived: archivedView ? 'only' as const : 'exclude' as const,
    reportType: 'marketing' as const,
    ...(viewMode === 'grouped' ? { groupBy: 'report_group' as const } : {}),
    page: 1,
    pageSize: 50,
  };

  const { data, isLoading, error, refetch } = useReports(reportFilters);

  const submitReport = useSubmitReport();
  const deleteReport = useDeleteReport();
  const restoreReport = useRestoreReport();

  const reports = data?.data || [];

  const statusOrder: Record<string, number> = { draft: 0, submitted: 1, rejected: 2, approved: 3 };

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({ initialColumn: 'submitted_at', initialDirection: 'desc' });

  const sortedReports = sortItems(reports, {
    campaign_type: (r) => r.marketing_context?.campaignType ?? '',
    objective: (r) => r.marketing_context?.objective ?? '',
    period: (r) => r.period_start ?? '',
    status: (r) => statusOrder[r.status] ?? 99,
    submitted_at: (r) => getSubmittedTimestamp(r) ?? '',
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const stats = useMemo(() => {
    const submitted = reports.filter((report) => report.status === 'submitted').length;
    const draft = reports.filter((report) => report.status === 'draft').length;
    const approved = reports.filter((report) => report.status === 'approved').length;

    return {
      total: reports.length,
      submitted,
      draft,
      approved,
    };
  }, [reports]);

  const pendingReportLabel =
    reportPendingDelete?.marketing_context?.campaignName ||
    (reportPendingDelete ? getReportTypeLabel(reportPendingDelete.report_type) : 'this report');

  const handleDeleteReport = () => {
    if (!reportPendingDelete) {
      return;
    }

    deleteReport.mutate(reportPendingDelete.id, {
      onSuccess: () => {
        addToast({
          title: reportPendingDelete.status === 'draft' ? 'Draft deleted' : 'Report archived',
          description:
            reportPendingDelete.status === 'draft'
              ? 'The marketing report draft has been removed.'
              : 'The marketing report has been archived.',
          variant: 'success',
        });
        setReportPendingDelete(null);
      },
      onError: (deleteError) => {
        addToast({
          title: reportPendingDelete.status === 'draft' ? 'Delete failed' : 'Archive failed',
          description: deleteError.message,
          variant: 'error',
        });
      },
    });
  };

  const handleSubmitDraft = useCallback(
    (reportId: string) => {
      submitReport.mutate(reportId, {
        onSuccess: () => {
          addToast({
            title: 'Marketing report submitted',
            description: 'Your marketing report has been submitted for review',
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
      });
    },
    [addToast, submitReport]
  );

  const handleRestoreReport = useCallback(
    (reportId: string) => {
      restoreReport.mutate(reportId, {
        onSuccess: () => {
          addToast({
            title: 'Report restored',
            description: 'The marketing report is back in your active reports list.',
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
    },
    [addToast, restoreReport]
  );

  return (
    <>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold text-foreground">Marketing Reports</h1>
            <SectionTooltip content="View, create, and track your submitted marketing reports and their approval status." />
          </div>
          <p className="text-muted-foreground">Create, submit, and track weekly marketing performance reports</p>
          <HelpLink href="/help/reports" label="Marketing Reports FAQ" LinkComponent={Link} />
        </div>
        <Button asChild>
          <Link href="/reports/new">
            <Plus className="mr-2 h-4 w-4" />
            New Marketing Report
          </Link>
        </Button>
      </div>

      <StatCardGrid columns={4}>
        <StatCard
          label="Total Reports"
          value={stats.total}
          icon={<FileText className="h-4 w-4" strokeWidth={1.5} />}
          tooltip={<SectionTooltip content="The total number of reports you've created across all statuses." />}
        />
        <StatCard
          label="Submitted"
          value={stats.submitted}
          icon={<Send className="h-4 w-4" strokeWidth={1.5} />}
          tooltip={<SectionTooltip content="Reports you've submitted and are awaiting review." />}
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
          tooltip={<SectionTooltip content="Reports that have been reviewed and approved." />}
        />
        <StatCard
          label="Drafts"
          value={stats.draft}
          icon={<Layers className="h-4 w-4" strokeWidth={1.5} />}
        />
      </StatCardGrid>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            placeholder="Search campaigns or report notes"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={status} onValueChange={(value) => setStatus(value as ReportStatusFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'flat'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <List className="h-3.5 w-3.5" strokeWidth={1.5} />
              Flat
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'grouped'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Layers className="h-3.5 w-3.5" strokeWidth={1.5} />
              Grouped
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={<Loader2 className="h-5 w-5 animate-spin" />}
              title="Loading reports"
              description="Fetching your submitted and draft marketing reports."
              size="sm"
            />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Unable to load reports"
              description="There was a problem fetching your marketing reports. Try again."
              action={{ label: 'Retry', onClick: () => refetch() }}
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
                  {viewMode === 'grouped' && <TableHead className="w-10" />}
                  <SortableTableHead column="campaign_type" {...sortHeadProps}>Campaign Type</SortableTableHead>
                  <SortableTableHead column="objective" {...sortHeadProps}>Objective</SortableTableHead>
                  {viewMode === 'grouped' && <TableHead>Group / Path</TableHead>}
                  <SortableTableHead column="period" {...sortHeadProps}>Period</SortableTableHead>
                  <SortableTableHead column="status" {...sortHeadProps}>Status</SortableTableHead>
                  <SortableTableHead column="submitted_at" {...sortHeadProps}>Submitted</SortableTableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={viewMode === 'grouped' ? 8 : 6}
                      className="text-center py-12"
                    >
                      <EmptyState
                        icon={FileText}
                        title="No marketing reports found"
                        description="Create your first marketing report to get started."
                        action={{
                          label: 'Create marketing report',
                          href: '/reports/new',
                          icon: <Plus className="h-3.5 w-3.5" />,
                        }}
                        size="sm"
                      />
                    </TableCell>
                  </TableRow>
                ) : viewMode === 'grouped' ? (
                  reports.map((report) => (
                    <GroupedReportRow
                      key={report.id}
                      report={report}
                      depth={0}
                      expandedIds={expandedIds}
                      onToggleExpand={toggleExpanded}
                      onDeleteReport={setReportPendingDelete}
                      onSubmitDraft={handleSubmitDraft}
                      onRestoreReport={handleRestoreReport}
                      deletePending={deleteReport.isPending}
                      restorePending={restoreReport.isPending}
                      submitPending={submitReport.isPending}
                      archivedView={archivedView}
                    />
                  ))
                ) : (
                  sortedReports.map((report) => (
                    <TableRow
                      key={report.id}
                      className={`${archivedView ? 'cursor-default' : 'cursor-pointer'} hover:bg-muted/50 transition-colors`}
                      onDoubleClick={() => {
                        if (!archivedView) {
                          router.push(`/reports/${report.id}`);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        {report.marketing_context?.campaignType
                          ? getMarketingCampaignTypeLabel(report.marketing_context.campaignType)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {report.marketing_context?.objective
                          ? getMarketingObjectiveLabel(report.marketing_context.objective)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(report.period_start)} – {formatDate(report.period_end)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[report.status]}>
                          {formatLabel(report.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(getSubmittedTimestamp(report))}
                      </TableCell>
                      <TableCell className="text-right">
                        <ReportActionsMenu
                          report={report}
                          onDeleteReport={setReportPendingDelete}
                          onSubmitDraft={handleSubmitDraft}
                          onRestoreReport={handleRestoreReport}
                          deletePending={deleteReport.isPending}
                          restorePending={restoreReport.isPending}
                          submitPending={submitReport.isPending}
                          archivedView={archivedView}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      </div>

      <Dialog open={Boolean(reportPendingDelete)} onOpenChange={(open) => !open && setReportPendingDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reportPendingDelete?.status === 'draft' ? 'Delete draft report?' : 'Archive report?'}
            </DialogTitle>
            <DialogDescription>
              {reportPendingDelete?.status === 'draft'
                ? `This will permanently remove ${pendingReportLabel}. Once deleted, the draft cannot be recovered from this page.`
                : `This will archive ${pendingReportLabel}. Archived reports are removed from your reports list.`}
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
              {deleteReport.isPending
                ? reportPendingDelete?.status === 'draft'
                  ? 'Deleting...'
                  : 'Archiving...'
                : reportPendingDelete?.status === 'draft'
                  ? 'Delete Draft'
                  : 'Archive Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Grouped View Components ---

function HierarchyBreadcrumb({ path }: { path: string[] }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {path.map((segment, index) => (
        <span key={`${segment}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
          <span>{segment}</span>
        </span>
      ))}
    </span>
  );
}

interface GroupedReportRowProps {
  report: ReportRecord;
  depth: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onDeleteReport: (report: ReportRecord) => void;
  onSubmitDraft: (reportId: string) => void;
  deletePending: boolean;
  onRestoreReport: (reportId: string) => void;
  restorePending: boolean;
  submitPending: boolean;
  archivedView: boolean;
}

function GroupedReportRow({
  report,
  depth,
  expandedIds,
  onToggleExpand,
  onDeleteReport,
  onSubmitDraft,
  deletePending,
  onRestoreReport,
  restorePending,
  submitPending,
  archivedView,
}: GroupedReportRowProps) {
  const isExpanded = expandedIds.has(report.id);
  const hasChildren = (report.child_count ?? 0) > 0;

  // Fetch children when expanded
  const { data: childrenData, isLoading: childrenLoading } = useReports(
    isExpanded
      ? {
          archived: archivedView ? 'only' : 'exclude',
          reportType: 'marketing',
          parentReportId: report.id,
          page: 1,
          pageSize: 100,
        }
      : { page: 1, pageSize: 0 }
  );

  const children = isExpanded ? (childrenData?.data ?? []) : [];

  return (
    <>
      <TableRow
        className={`${archivedView ? 'cursor-default' : 'cursor-pointer'} hover:bg-muted/50 transition-colors ${depth > 0 ? 'bg-muted/30' : ''}`}
        onDoubleClick={() => {
          if (!archivedView) {
            window.location.href = `/reports/${report.id}`;
          }
        }}
      >
        <TableCell className="w-10">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggleExpand(report.id)}
              className="inline-flex items-center justify-center rounded p-1 hover:bg-muted"
              style={{ marginLeft: `${depth * 16}px` }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span style={{ marginLeft: `${depth * 16 + 24}px` }} />
          )}
        </TableCell>
        <TableCell className="font-medium">
          <span style={{ paddingLeft: `${depth * 16}px` }}>
            {report.marketing_context?.campaignType
              ? getMarketingCampaignTypeLabel(report.marketing_context.campaignType)
              : '—'}
            {hasChildren && (
              <CountBadge className="ml-2" variant="info" size="md" count={report.child_count ?? 0} />
            )}
          </span>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {report.marketing_context?.objective
            ? getMarketingObjectiveLabel(report.marketing_context.objective)
            : '—'}
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            {report.report_group && (
              <Badge variant="secondary" className="text-xs">
                {report.report_group}
              </Badge>
            )}
            {report.hierarchy_path && (
              <div>
                <HierarchyBreadcrumb path={report.hierarchy_path} />
              </div>
            )}
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatDate(report.period_start)} – {formatDate(report.period_end)}
        </TableCell>
        <TableCell>
          <Badge variant={statusVariant[report.status]}>{formatLabel(report.status)}</Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatDate(getSubmittedTimestamp(report))}
        </TableCell>
        <TableCell className="text-right">
          <ReportActionsMenu
            report={report}
            onDeleteReport={onDeleteReport}
            onSubmitDraft={onSubmitDraft}
            onRestoreReport={onRestoreReport}
            deletePending={deletePending}
            restorePending={restorePending}
            submitPending={submitPending}
            archivedView={archivedView}
          />
        </TableCell>
      </TableRow>
      {isExpanded && childrenLoading && (
        <TableRow>
          <TableCell colSpan={8} className="py-6">
            <EmptyState
              icon={<Loader2 className="h-5 w-5 animate-spin" />}
              title="Loading child reports"
              description="Fetching related reports in this hierarchy."
              size="sm"
            />
          </TableCell>
        </TableRow>
      )}
      {isExpanded &&
        children.map((child) => (
          <GroupedReportRow
            key={child.id}
            report={child}
            depth={depth + 1}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            onDeleteReport={onDeleteReport}
            onSubmitDraft={onSubmitDraft}
            deletePending={deletePending}
            onRestoreReport={onRestoreReport}
            restorePending={restorePending}
            submitPending={submitPending}
            archivedView={archivedView}
          />
        ))}
    </>
  );
}

interface ReportActionsMenuProps {
  report: ReportRecord;
  onDeleteReport: (report: ReportRecord) => void;
  onSubmitDraft: (reportId: string) => void;
  deletePending: boolean;
  onRestoreReport: (reportId: string) => void;
  restorePending: boolean;
  submitPending: boolean;
  archivedView: boolean;
}

function ReportActionsMenu({
  report,
  onDeleteReport,
  onSubmitDraft,
  deletePending,
  onRestoreReport,
  restorePending,
  submitPending,
  archivedView,
}: ReportActionsMenuProps) {
  return (
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
                <Link href={`/reports/${report.id}`}>
                  <Eye className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                  View report
                </Link>
              </DropdownMenuItem>
              {report.status === 'draft' && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/reports/${report.id}/edit`}>
                      <Pencil className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                      Edit draft
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={submitPending} onClick={() => onSubmitDraft(report.id)}>
                    <Send className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                    Submit report
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
          {archivedView ? (
            <DropdownMenuItem disabled={restorePending} onClick={() => onRestoreReport(report.id)}>
              <ArchiveRestore className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
              Restore report
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={deletePending}
                onClick={() => onDeleteReport(report)}
                className="text-rose-600 focus:text-rose-700"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                {report.status === 'draft' ? 'Delete draft' : 'Archive report'}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
