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
import { Eye } from 'lucide-react';
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
    const all = data?.data || [];
    if (department === 'all') return all;
    return all.filter((r) => r.employees?.department?.toLowerCase() === department.toLowerCase());
  }, [data?.data, department]);

  const stats = useMemo(() => {
    const submitted = reports.filter((report) => report.status === 'submitted').length;
    const approved = reports.filter((report) => report.status === 'approved').length;
    const rejected = reports.filter((report) => report.status === 'rejected').length;
    return { submitted, approved, rejected, total: reports.length };
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input
          placeholder="Search report type or notes"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
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
                  <TableHead>Action Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
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
