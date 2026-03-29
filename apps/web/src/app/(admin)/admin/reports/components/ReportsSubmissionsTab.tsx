'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { useReports } from '@/hooks/useReports';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate, formatLabel } from '@/lib/format';
import {
  getMarketingCampaignTypeLabel,
  getMarketingObjectiveLabel,
  getMarketingReportContextSummary,
  getMarketingReportDisplayName,
  matchesMarketingReportFilters,
  type MarketingCampaignFilterValue,
  type MarketingObjectiveFilterValue,
} from '@/lib/report-utils';
import {
  Badge,
  Button,
  Card,
  CardContent,
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
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import { AlertCircle, Eye, Loader2, Search } from 'lucide-react';
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
  campaignType: MarketingCampaignFilterValue;
  objective: MarketingObjectiveFilterValue;
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
  campaignType,
  objective,
  timeRange,
  customStartDate,
  customEndDate,
}: ReportsSubmissionsTabProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [localPeriod, setLocalPeriod] = useState<'all' | 'weekly' | 'monthly' | 'custom'>(
    timeRange
  );
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
    ...(status !== 'all'
      ? { status: status as 'draft' | 'submitted' | 'approved' | 'rejected' }
      : {}),
    ...(department !== 'all' ? { department } : {}),
    reportType: 'marketing' as const,
    ...(periodDates ? { periodStart: periodDates.start, periodEnd: periodDates.end } : {}),
    page: 1,
    pageSize: 100,
  };

  const { data, isLoading, error, refetch } = useReports(filters);

  const reports = useMemo(() => {
    let all = data?.data || [];

    all = all.filter((report) =>
      matchesMarketingReportFilters(report, {
        campaignType,
        objective,
        search,
      })
    );
    return all;
  }, [campaignType, data?.data, objective, search]);

  const reportStatusOrder: Record<string, number> = { submitted: 0, draft: 1, rejected: 2, approved: 3 };

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({ initialColumn: 'period', initialDirection: 'desc' });

  const sortedReports = sortItems(reports, {
    employee: (r) => r.employees ? `${r.employees.first_name} ${r.employees.last_name}`.toLowerCase() : '',
    campaign: (r) => getMarketingReportDisplayName(r.marketing_context).toLowerCase(),
    campaignType: (r) =>
      r.marketing_context?.campaignType
        ? getMarketingCampaignTypeLabel(r.marketing_context.campaignType).toLowerCase()
        : '',
    goal: (r) =>
      r.marketing_context?.objective
        ? getMarketingObjectiveLabel(r.marketing_context.objective).toLowerCase()
        : '',
    status: (r) => reportStatusOrder[r.status] ?? 99,
    period: (r) => r.period_start ?? '',
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  const stats = useMemo(() => {
    const draft = reports.filter((report) => report.status === 'draft').length;
    const submitted = reports.filter((report) => report.status === 'submitted').length;
    const approved = reports.filter((report) => report.status === 'approved').length;
    const rejected = reports.filter((report) => report.status === 'rejected').length;
    return { draft, submitted, approved, rejected, total: reports.length };
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
            <p className="text-sm text-muted-foreground">Drafts</p>
            <p className="text-2xl font-bold">{stats.draft}</p>
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
        <Select value={localPeriod} onValueChange={(v) => setLocalPeriod(v as typeof localPeriod)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Time</SelectItem>
            <SelectItem value="weekly">This Week</SelectItem>
            <SelectItem value="monthly">This Month</SelectItem>
            {customStartDate && customEndDate && (
              <SelectItem value="custom">Custom Range</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Review Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
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
                  <TableHead>Review Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10">
                      <EmptyState
                        icon={Search}
                        title="No marketing reports found"
                        description="Adjust the filters or wait for submissions to appear in this queue."
                        size="sm"
                      />
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
                        {report.marketing_context?.campaignType
                          ? getMarketingCampaignTypeLabel(report.marketing_context.campaignType)
                          : '—'}
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
                        {report.marketing_context?.objective
                          ? getMarketingObjectiveLabel(report.marketing_context.objective)
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
