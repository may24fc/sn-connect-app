'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { MarketingReportsAccessState } from '@/components/reports/MarketingReportsAccessState';
import { useMarketingReportsAccess } from '@/hooks/useMarketingReportsAccess';
import { type ReportRecord, useReports } from '@/hooks/useReports';
import { useSubmitReport } from '@/hooks/useSubmitReport';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate, formatLabel } from '@/lib/format';
import { getReportTypeLabel, getReportTypeDescription } from '@/lib/report-utils';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CountBadge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBreakdownChart,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  SectionTooltip,
  HelpLink,
  useToast,
} from '@hr-portal/ui';
import { ChevronDown, ChevronRight, CheckCircle2, FileText, Layers, List, Plus, Search, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

const statusVariant: Record<
  'draft' | 'submitted' | 'approved' | 'rejected',
  'secondary' | 'pending' | 'approved' | 'error'
> = {
  draft: 'secondary',
  submitted: 'pending',
  approved: 'approved',
  rejected: 'error',
};

export default function ReportsPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const marketingAccess = useMarketingReportsAccess();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (marketingAccess.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading marketing reports...</div>;
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
    ...(status !== 'all'
      ? { status: status as 'draft' | 'submitted' | 'approved' | 'rejected' }
      : {}),
    reportType: 'marketing' as const,
    ...(viewMode === 'grouped' ? { groupBy: 'report_group' as const } : {}),
    page: 1,
    pageSize: 50,
  };

  const { data, isLoading, error, refetch } = useReports(reportFilters);

  const submitReport = useSubmitReport();

  const reports = data?.data || [];

  const statusOrder: Record<string, number> = { draft: 0, submitted: 1, rejected: 2, approved: 3 };

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({ initialColumn: 'submitted_at', initialDirection: 'desc' });

  const sortedReports = sortItems(reports, {
    report_type: (r) => r.report_type,
    period: (r) => r.period_start ?? '',
    status: (r) => statusOrder[r.status] ?? 99,
    submitted_at: (r) => r.submitted_at ?? '',
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

  const statusChartData = useMemo(() => [
    { status: 'Draft', count: stats.draft, color: '#95A5A6' },
    { status: 'Submitted', count: stats.submitted, color: '#F39C12' },
    { status: 'Approved', count: stats.approved, color: '#27AE60' },
    { status: 'Rejected', count: reports.filter((r) => r.status === 'rejected').length, color: '#E74C3C' },
  ].filter((d) => d.count > 0), [stats, reports]);

  return (
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

      {/* Status Distribution Chart */}
      {statusChartData.length > 0 && (
        <StatusBreakdownChart
          data={statusChartData}
          title="Report Status Overview"
          description="Distribution of your reports by status"
        />
      )}

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
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
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
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading reports...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-destructive">Failed to load reports. Please try again.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {viewMode === 'grouped' && <TableHead className="w-10" />}
                  <SortableTableHead column="report_type" {...sortHeadProps}>Type</SortableTableHead>
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
                      colSpan={viewMode === 'grouped' ? 7 : 5}
                      className="text-center py-12"
                    >
                      <div className="space-y-2">
                        <p className="text-muted-foreground">No marketing reports found.</p>
                        <p className="text-sm text-muted-foreground">
                          Create your first marketing report to get started.
                        </p>
                        <Button variant="outline" size="sm" asChild className="mt-2">
                          <Link href="/reports/new">
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Create Marketing Report
                          </Link>
                        </Button>
                      </div>
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
                      submitReport={submitReport}
                      addToast={addToast}
                    />
                  ))
                ) : (
                  sortedReports.map((report) => (
                    <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onDoubleClick={() => router.push(`/reports/${report.id}`)}>
                      <TableCell className="font-medium">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help border-b border-dotted border-muted-foreground/40">
                                {getReportTypeLabel(report.report_type)}
                              </span>
                            </TooltipTrigger>
                            {getReportTypeDescription(report.report_type) && (
                              <TooltipContent side="right" className="max-w-xs">
                                <p>{getReportTypeDescription(report.report_type)}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
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
                        {formatDate(report.submitted_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/reports/${report.id}`}>View</Link>
                          </Button>
                          {report.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() =>
                                submitReport.mutate(report.id, {
                                  onSuccess: () => {
                                    addToast({
                                      title: 'Marketing report submitted',
                                      description: 'Your marketing report has been submitted for review',
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
  submitReport: ReturnType<typeof useSubmitReport>;
  addToast: ReturnType<typeof useToast>['addToast'];
}

function GroupedReportRow({
  report,
  depth,
  expandedIds,
  onToggleExpand,
  submitReport,
  addToast,
}: GroupedReportRowProps) {
  const isExpanded = expandedIds.has(report.id);
  const hasChildren = (report.child_count ?? 0) > 0;

  // Fetch children when expanded
  const { data: childrenData, isLoading: childrenLoading } = useReports(
    isExpanded
      ? {
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
      <TableRow className={`cursor-pointer hover:bg-muted/50 transition-colors ${depth > 0 ? 'bg-muted/30' : ''}`} onDoubleClick={() => { window.location.href = `/reports/${report.id}`; }}>
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
            {getReportTypeLabel(report.report_type)}
            {hasChildren && (
              <CountBadge className="ml-2" variant="info" size="md" count={report.child_count ?? 0} />
            )}
          </span>
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
          {formatDate(report.submitted_at)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/reports/${report.id}`}>View</Link>
            </Button>
            {report.status === 'draft' && (
              <Button
                size="sm"
                onClick={() =>
                  submitReport.mutate(report.id, {
                    onSuccess: () => {
                      addToast({
                        title: 'Marketing report submitted',
                        description: 'Your marketing report has been submitted for review',
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
        </TableCell>
      </TableRow>
      {isExpanded && childrenLoading && (
        <TableRow>
          <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
            Loading child reports...
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
            submitReport={submitReport}
            addToast={addToast}
          />
        ))}
    </>
  );
}
