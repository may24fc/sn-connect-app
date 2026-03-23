'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { useReports } from '@/hooks/useReports';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate, formatLabel } from '@/lib/format';
import { getReportTypeLabel, getReportTypeDescription } from '@/lib/report-utils';
import {
  Badge,
  Button,
  Card,
  CardContent,
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
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import { AlertTriangle, Eye } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

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
  timeRange: 'weekly' | 'monthly' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
}

/**
 * Safely extract date string (YYYY-MM-DD) from an ISO string or return as-is
 */
function extractDateString(dateStr: string): string {
  if (dateStr.includes('T')) {
    return dateStr.substring(0, 10);
  }
  return dateStr;
}

/**
 * Calculate period dates based on the time range
 */
function getPeriodDates(
  timeRange: 'weekly' | 'monthly' | 'custom',
  customStartDate?: string,
  customEndDate?: string
): { start: string; end: string } | null {
  const now = new Date();

  if (timeRange === 'custom' && customStartDate && customEndDate) {
    return { start: customStartDate, end: customEndDate };
  }

  if (timeRange === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: extractDateString(start.toISOString()),
      end: extractDateString(end.toISOString()),
    };
  }

  if (timeRange === 'weekly') {
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return {
      start: extractDateString(start.toISOString()),
      end: extractDateString(end.toISOString()),
    };
  }

  return null;
}

export function ReportsSubmissionsTab({
  department,
  timeRange,
  customStartDate,
  customEndDate,
}: ReportsSubmissionsTabProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [localPeriod, setLocalPeriod] = useState<'all' | 'weekly' | 'monthly' | 'custom'>(
    timeRange
  );
  const [showLateOnly, setShowLateOnly] = useState(false);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState<string | null>(null);
  const { addToast } = useToast();
  const router = useRouter();

  // Calculate period dates for API filtering
  const periodDates = useMemo(() => {
    if (localPeriod === 'all') return null;
    return getPeriodDates(
      localPeriod === 'custom' ? 'custom' : localPeriod,
      customStartDate,
      customEndDate
    );
  }, [localPeriod, customStartDate, customEndDate]);

  const filters = {
    ...(search ? { search } : {}),
    ...(status !== 'all'
      ? { status: status as 'draft' | 'submitted' | 'approved' | 'rejected' }
      : {}),
    ...(department !== 'all' ? { department } : {}),
    ...(periodDates ? { periodStart: periodDates.start, periodEnd: periodDates.end } : {}),
    page: 1,
    pageSize: 100,
  };

  const { data, isLoading, error, refetch } = useReports(filters);

  // Additional client-side filtering for late reports
  const reports = useMemo(() => {
    let all = data?.data || [];
    if (showLateOnly) {
      const now = new Date();
      all = all.filter((r) => {
        if (r.status !== 'submitted' && r.status !== 'draft') return false;
        const periodEnd = r.period_end ? new Date(r.period_end) : null;
        if (!periodEnd) return false;
        const daysSince = Math.floor((now.getTime() - periodEnd.getTime()) / 86_400_000);
        return daysSince > 7;
      });
    }
    return all;
  }, [data?.data, showLateOnly]);

  const reportStatusOrder: Record<string, number> = { submitted: 0, draft: 1, rejected: 2, approved: 3 };

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({ initialColumn: 'period', initialDirection: 'desc' });

  const sortedReports = sortItems(reports, {
    employee: (r) => r.employees ? `${r.employees.first_name} ${r.employees.last_name}`.toLowerCase() : '',
    department: (r) => r.employees?.department?.toLowerCase() ?? '',
    type: (r) => r.report_type.toLowerCase(),
    status: (r) => reportStatusOrder[r.status] ?? 99,
    period: (r) => r.period_start ?? '',
    overdue: (r) => getDaysOverdue(r.period_end),
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  /** Calculate days overdue for a report (>7 days past period_end) */
  function getDaysOverdue(periodEnd: string | null | undefined): number {
    if (!periodEnd) return 0;
    const end = new Date(periodEnd);
    const daysSince = Math.floor((Date.now() - end.getTime()) / 86_400_000);
    return daysSince > 7 ? daysSince - 7 : 0;
  }

  const stats = useMemo(() => {
    const submitted = reports.filter((report) => report.status === 'submitted').length;
    const approved = reports.filter((report) => report.status === 'approved').length;
    const rejected = reports.filter((report) => report.status === 'rejected').length;
    const overdue = reports.filter((report) => {
      if (report.status === 'approved' || report.status === 'rejected') return false;
      return getDaysOverdue(report.period_end) > 0;
    }).length;
    return { submitted, approved, rejected, overdue, total: reports.length };
  }, [reports]);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setWorkingId(id);
    try {
      const res = await fetch(`/api/reports/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: actionNotes[id] || undefined }),
      });
      if (!res.ok) throw new Error('Request failed');
      addToast({ title: `Report ${action}`, variant: 'success' });
      await refetch();
    } catch {
      addToast({ title: `Failed to ${action === 'approved' ? 'approve' : 'reject'} report`, variant: 'error' });
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total</p>
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
        <Card
          className={
            stats.overdue > 0 ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950' : ''
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {stats.overdue > 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
            <p
              className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : ''}`}
            >
              {stats.overdue}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search report type or notes"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <Select value={localPeriod} onValueChange={(v) => setLocalPeriod(v as typeof localPeriod)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="weekly">This Week</SelectItem>
            <SelectItem value="monthly">This Month</SelectItem>
            {customStartDate && customEndDate && (
              <SelectItem value="custom">Custom Range</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant={showLateOnly ? 'destructive' : 'outline'}
          onClick={() => setShowLateOnly((prev) => !prev)}
          className="whitespace-nowrap"
        >
          <AlertTriangle className="mr-1 h-3.5 w-3.5" />
          {showLateOnly ? 'Show All' : 'Show Late Only'}
        </Button>
      </div>

      {/* Table */}
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
                  <SortableTableHead column="employee" {...sortHeadProps}>Employee</SortableTableHead>
                  <SortableTableHead column="department" {...sortHeadProps}>Department</SortableTableHead>
                  <SortableTableHead column="type" {...sortHeadProps}>Type</SortableTableHead>
                  <SortableTableHead column="status" {...sortHeadProps}>Status</SortableTableHead>
                  <SortableTableHead column="period" {...sortHeadProps}>Period</SortableTableHead>
                  <SortableTableHead column="overdue" {...sortHeadProps}>Overdue</SortableTableHead>
                  <TableHead>Action Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No reports found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedReports.map((report) => (
                    <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onDoubleClick={() => router.push(`/admin/reports/${report.id}`)}>
                      <TableCell>
                        {report.employees
                          ? `${report.employees.first_name} ${report.employees.last_name}`
                          : '-'}
                      </TableCell>
                      <TableCell>{report.employees?.department || '—'}</TableCell>
                      <TableCell>
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
                      <TableCell>
                        <Badge variant={statusVariant[report.status]}>
                          {formatLabel(report.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(report.period_start)} – {formatDate(report.period_end)}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const days = getDaysOverdue(report.period_end);
                          if (
                            days <= 0 ||
                            report.status === 'approved' ||
                            report.status === 'rejected'
                          )
                            return <span className="text-muted-foreground">—</span>;
                          return (
                            <Badge variant="error" className="whitespace-nowrap">
                              {days}d late
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <Textarea
                          rows={2}
                          value={actionNotes[report.id] || ''}
                          onChange={(event) =>
                            setActionNotes((prev) => ({
                              ...prev,
                              [report.id]: event.target.value,
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/admin/reports/${report.id}`}>
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              View
                            </Link>
                          </Button>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={report.status !== 'submitted' ? 'opacity-50' : ''}
                                    disabled={
                                      workingId === report.id || report.status !== 'submitted'
                                    }
                                    onClick={() => handleAction(report.id, 'approved')}
                                  >
                                    Approve
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {report.status !== 'submitted' && (
                                <TooltipContent>
                                  <p>Only submitted reports can be approved</p>
                                  <p className="text-xs text-muted-foreground">
                                    Current status: {formatLabel(report.status)}
                                  </p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className={report.status !== 'submitted' ? 'opacity-50' : ''}
                                    disabled={
                                      workingId === report.id || report.status !== 'submitted'
                                    }
                                    onClick={() => handleAction(report.id, 'rejected')}
                                  >
                                    Reject
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {report.status !== 'submitted' && (
                                <TooltipContent>
                                  <p>Only submitted reports can be rejected</p>
                                  <p className="text-xs text-muted-foreground">
                                    Current status: {formatLabel(report.status)}
                                  </p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
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
