'use client';

import { useReport } from '@/hooks/useReport';
import { useSubmitReport } from '@/hooks/useSubmitReport';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hr-portal/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

const statusVariant: Record<
  'draft' | 'submitted' | 'approved' | 'rejected',
  'secondary' | 'pending' | 'approved' | 'error'
> = {
  draft: 'secondary',
  submitted: 'pending',
  approved: 'approved',
  rejected: 'error',
};

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = useReport(id);
  const submitReport = useSubmitReport();

  const report = data?.data;

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading report...</div>;
  }

  if (error || !report) {
    return <div className="text-sm text-error">Failed to load report.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/reports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-headline">{report.report_type}</h1>
            <p className="text-muted-foreground">
              {report.period_start} to {report.period_end}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant[report.status]}>{report.status}</Badge>
          {report.status === 'draft' && (
            <Button
              onClick={() => submitReport.mutate(report.id)}
              disabled={submitReport.isPending}
            >
              Submit
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Employee:</span>{' '}
            {report.employees
              ? `${report.employees.first_name} ${report.employees.last_name}`
              : '-'}
          </p>
          <p>
            <span className="text-muted-foreground">Department:</span>{' '}
            {report.employees?.department || '-'}
          </p>
          <p>
            <span className="text-muted-foreground">Submitted At:</span>{' '}
            {report.submitted_at ? report.submitted_at.replace('T', ' ').slice(0, 16) : '-'}
          </p>
          <p>
            <span className="text-muted-foreground">Notes:</span> {report.notes || '-'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(report.report_metrics || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No metrics attached.
                  </TableCell>
                </TableRow>
              ) : (
                (report.report_metrics || []).map((metric) => (
                  <TableRow key={metric.id}>
                    <TableCell>{metric.metric_name}</TableCell>
                    <TableCell>{metric.metric_value}</TableCell>
                    <TableCell>{metric.metric_unit || '-'}</TableCell>
                    <TableCell>{metric.notes || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
