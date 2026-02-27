'use client';

import { useReports } from '@/hooks/useReports';
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
} from '@hr-portal/ui';
import { AlertTriangle, Eye } from 'lucide-react';
import Link from 'next/link';
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

export function ReportsSubmissionsTab({
  department,
  timeRange: _timeRange,
  customStartDate: _customStartDate,
  customEndDate: _customEndDate,
}: ReportsSubmissionsTabProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [showLateOnly, setShowLateOnly] = useState(false);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState<string | null>(null);

  const filters = {
    ...(search ? { search } : {}),
    ...(status !== 'all'
      ? { status: status as 'draft' | 'submitted' | 'approved' | 'rejected' }
      : {}),
    page: 1,
    pageSize: 100,
  };

  const { data, isLoading, error, refetch } = useReports(filters);

  // Filter by department client-side (API doesn't support department filter yet)
  const reports = useMemo(() => {
    let all = data?.data || [];
    if (department !== 'all') {
      all = all.filter((r) => r.employees?.department?.toLowerCase() === department.toLowerCase());
    }
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
  }, [data?.data, department, showLateOnly]);

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
      await fetch(`/api/reports/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: actionNotes[id] || undefined }),
      });
      await refetch();
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
          className="flex-1"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
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
          <CardContent className="p-6 text-sm text-error">Failed to load reports.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Overdue</TableHead>
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
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        {report.employees
                          ? `${report.employees.first_name} ${report.employees.last_name}`
                          : '-'}
                      </TableCell>
                      <TableCell>{report.employees?.department || '-'}</TableCell>
                      <TableCell>{report.report_type}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[report.status]}>{report.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {report.period_start} to {report.period_end}
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
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={workingId === report.id || report.status !== 'submitted'}
                            onClick={() => handleAction(report.id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={workingId === report.id || report.status !== 'submitted'}
                            onClick={() => handleAction(report.id, 'rejected')}
                          >
                            Reject
                          </Button>
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
