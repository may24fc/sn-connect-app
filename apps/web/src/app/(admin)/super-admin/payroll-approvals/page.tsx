'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { useApproveInvoice, useInvoices } from '@/hooks/useInvoices';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate, formatLabel } from '@/lib/format';
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

const CURRENCY_LOCALES: Record<string, string> = {
  PHP: 'en-PH',
  USD: 'en-US',
  EUR: 'de-DE',
  AUD: 'en-AU',
  GBP: 'en-GB',
  SGD: 'en-SG',
  JPY: 'ja-JP',
};

const formatCurrency = (value: number, currencyCode = 'PHP') =>
  new Intl.NumberFormat(CURRENCY_LOCALES[currencyCode] || 'en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
    maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
  }).format(value || 0);

export default function PayrollApprovalsPage() {
  const { data, isLoading, error } = useInvoices({ page: 1, pageSize: 200 });
  const approveInvoice = useApproveInvoice();
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const invoices = data?.data || [];

  const pendingSort = useTableSort({ initialColumn: 'employee' });
  const processedSort = useTableSort({ initialColumn: 'approved_at', initialDirection: 'desc' });

  const invoiceStatusOrder: Record<string, number> = { approved: 0, paid: 1, rejected: 2, draft: 3 };

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

  const sortedPending = pendingSort.sortItems(pending, {
    employee: (i) => i.employees ? `${i.employees.first_name} ${i.employees.last_name}`.toLowerCase() : '',
    invoice_number: (i) => i.invoice_number,
    period: (i) => i.period_start ?? '',
    amount: (i) => Number(i.net_amount || 0),
  });
  const pendingSortHeadProps = { sortColumn: pendingSort.sortColumn, sortDirection: pendingSort.sortDirection, onSort: pendingSort.handleSort };

  const sortedProcessed = processedSort.sortItems(processed, {
    employee: (i) => i.employees ? `${i.employees.first_name} ${i.employees.last_name}`.toLowerCase() : '',
    invoice_number: (i) => i.invoice_number,
    status: (i) => invoiceStatusOrder[i.status] ?? 99,
    amount: (i) => Number(i.net_amount || 0),
    approved_at: (i) => i.approved_at ?? '',
  });
  const processedSortHeadProps = { sortColumn: processedSort.sortColumn, sortDirection: processedSort.sortDirection, onSort: processedSort.handleSort };

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
                    <SortableTableHead column="employee" {...pendingSortHeadProps}>Employee</SortableTableHead>
                    <SortableTableHead column="invoice_number" {...pendingSortHeadProps}>Invoice #</SortableTableHead>
                    <SortableTableHead column="period" {...pendingSortHeadProps}>Period</SortableTableHead>
                    <SortableTableHead column="amount" {...pendingSortHeadProps}>Amount</SortableTableHead>
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
                    sortedPending.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          {invoice.employees
                            ? `${invoice.employees.first_name} ${invoice.employees.last_name}`
                            : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const inv = invoice as unknown as Record<string, unknown>;
                            const srcCurrency = (inv.source_currency as string) || 'PHP';
                            const tgtCurrency = (inv.target_currency as string) || 'PHP';
                            const convertedAmt = inv.converted_amount as number | null;
                            return (
                              <div>
                                <span>
                                  {formatCurrency(Number(invoice.net_amount || 0), srcCurrency)}
                                </span>
                                {convertedAmt && srcCurrency !== tgtCurrency && (
                                  <span className="block text-xs text-muted-foreground">
                                    ≈ {formatCurrency(Number(convertedAmt || 0), tgtCurrency)}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
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
                    <SortableTableHead column="employee" {...processedSortHeadProps}>Employee</SortableTableHead>
                    <SortableTableHead column="invoice_number" {...processedSortHeadProps}>Invoice #</SortableTableHead>
                    <SortableTableHead column="status" {...processedSortHeadProps}>Status</SortableTableHead>
                    <SortableTableHead column="amount" {...processedSortHeadProps}>Amount</SortableTableHead>
                    <SortableTableHead column="approved_at" {...processedSortHeadProps}>Approved At</SortableTableHead>
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
                    sortedProcessed.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          {invoice.employees
                            ? `${invoice.employees.first_name} ${invoice.employees.last_name}`
                            : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[invoice.status]}>
                            {formatLabel(invoice.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(Number(invoice.net_amount || 0))}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(invoice.approved_at)}
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
