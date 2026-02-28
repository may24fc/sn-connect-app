'use client';

import { type ReportRecord, useReports } from '@/hooks/useReports';
import { useSubmitReport } from '@/hooks/useSubmitReport';
import { formatDate, formatLabel } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  useToast,
} from '@hr-portal/ui';
import { ChevronDown, ChevronRight, Layers, List, Plus } from 'lucide-react';
import Link from 'next/link';
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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const reportFilters = {
    ...(search ? { search } : {}),
    ...(status !== 'all'
      ? { status: status as 'draft' | 'submitted' | 'approved' | 'rejected' }
      : {}),
    ...(viewMode === 'grouped' ? { groupBy: 'report_group' as const } : {}),
    page: 1,
    pageSize: 50,
  };

  const { data, isLoading, error } = useReports(reportFilters);

  const submitReport = useSubmitReport();

  const reports = data?.data || [];

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline">My Reports</h1>
          <p className="text-muted-foreground">Create, submit, and track report approvals</p>
        </div>
        <Button asChild>
          <Link href="/reports/new">
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.submitted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.draft}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search by report type or notes"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
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

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading reports...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-error">Failed to load reports.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {viewMode === 'grouped' && <TableHead className="w-10" />}
                  <TableHead>Type</TableHead>
                  {viewMode === 'grouped' && <TableHead>Group / Path</TableHead>}
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={viewMode === 'grouped' ? 7 : 5}
                      className="text-center text-muted-foreground"
                    >
                      No reports found.
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
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.report_type}</TableCell>
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
          parentReportId: report.id,
          page: 1,
          pageSize: 100,
        }
      : { page: 1, pageSize: 0 }
  );

  const children = isExpanded ? (childrenData?.data ?? []) : [];

  return (
    <>
      <TableRow className={depth > 0 ? 'bg-muted/30' : undefined}>
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
            {report.report_type}
            {hasChildren && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {report.child_count}
              </Badge>
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
