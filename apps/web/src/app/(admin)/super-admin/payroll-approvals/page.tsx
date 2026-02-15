'use client';

import { useApproveInvoice, useInvoices } from '@/hooks/useInvoices';
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
  Textarea,
} from '@hr-portal/ui';
import { useMemo, useState } from 'react';

const statusVariant: Record<
  'draft' | 'submitted' | 'approved' | 'paid' | 'rejected',
  'secondary' | 'pending' | 'approved' | 'error'
> = {
  draft: 'secondary',
  submitted: 'pending',
  approved: 'approved',
  paid: 'approved',
  rejected: 'error',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(value || 0);

export default function PayrollApprovalsPage() {
  const { data, isLoading, error } = useInvoices({ page: 1, pageSize: 200 });
  const approveInvoice = useApproveInvoice();
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const invoices = data?.data || [];

  const pending = useMemo(
    () => invoices.filter((invoice) => invoice.status === 'submitted'),
    [invoices]
  );

  const processed = useMemo(
    () => invoices.filter((invoice) => invoice.status !== 'submitted'),
    [invoices]
  );

  const stats = useMemo(() => {
    return {
      pending: pending.length,
      approved: invoices.filter((invoice) => invoice.status === 'approved').length,
      rejected: invoices.filter((invoice) => invoice.status === 'rejected').length,
      pendingAmount: pending.reduce((sum, invoice) => sum + Number(invoice.net_amount || 0), 0),
    };
  }, [invoices, pending]);

  const handleAction = (id: string, action: 'approved' | 'rejected') => {
    approveInvoice.mutate({
      id,
      payload: {
        action,
        notes: notesById[id] || undefined,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline">Payroll Approvals</h1>
        <p className="text-muted-foreground">Review and approve submitted invoices</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.pending}</p>
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
            <CardTitle className="text-sm">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.rejected}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatCurrency(stats.pendingAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading invoices...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-error">Failed to load invoices.</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Pending</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No pending invoices.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pending.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          {invoice.employees
                            ? `${invoice.employees.first_name} ${invoice.employees.last_name}`
                            : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          {invoice.period_start} to {invoice.period_end}
                        </TableCell>
                        <TableCell>{formatCurrency(Number(invoice.net_amount || 0))}</TableCell>
                        <TableCell className="min-w-[220px]">
                          <Textarea
                            rows={2}
                            value={notesById[invoice.id] || ''}
                            onChange={(event) =>
                              setNotesById((prev) => ({
                                ...prev,
                                [invoice.id]: event.target.value,
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(invoice.id, 'approved')}
                              disabled={approveInvoice.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(invoice.id, 'rejected')}
                              disabled={approveInvoice.isPending}
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

          <Card>
            <CardHeader>
              <CardTitle>Processed</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Approved At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processed.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No processed invoices.
                      </TableCell>
                    </TableRow>
                  ) : (
                    processed.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          {invoice.employees
                            ? `${invoice.employees.first_name} ${invoice.employees.last_name}`
                            : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[invoice.status]}>{invoice.status}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(Number(invoice.net_amount || 0))}</TableCell>
                        <TableCell>
                          {invoice.approved_at ? invoice.approved_at.slice(0, 10) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
