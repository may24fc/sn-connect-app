'use client';

import { useReports } from '@/hooks/useReports';
import { useSubmitReport } from '@/hooks/useSubmitReport';
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
import { Plus } from 'lucide-react';
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

export default function ReportsPage() {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');

  const reportFilters = {
    ...(search ? { search } : {}),
    ...(status !== 'all'
      ? { status: status as 'draft' | 'submitted' | 'approved' | 'rejected' }
      : {}),
    page: 1,
    pageSize: 50,
  };

  const { data, isLoading, error } = useReports(reportFilters);

  const submitReport = useSubmitReport();

  const reports = data?.data || [];

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
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No reports found.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.report_type}</TableCell>
                      <TableCell>
                        {report.period_start} to {report.period_end}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[report.status]}>{report.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {report.submitted_at ? report.submitted_at.slice(0, 10) : '-'}
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
                                      description: `${report.title} has been submitted for review`,
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
