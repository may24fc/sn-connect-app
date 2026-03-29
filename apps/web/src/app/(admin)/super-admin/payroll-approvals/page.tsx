'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import type { InvoiceRecord } from '@/hooks/useInvoices';
import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import { AlertCircle, CheckCircle2, Clock, DollarSign, Loader2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const { addToast } = useToast();

  // Track which employees have Wise recipients (employee_id → hasRecipient)
  const [employeesWithRecipient, setEmployeesWithRecipient] = useState<Set<string>>(new Set());
  const [loadingRecipientInfo, setLoadingRecipientInfo] = useState(true);

  // Fetch banking info for all employees to check who has Wise recipients
  useEffect(() => {
    const fetchBankingInfo = async () => {
      try {
        setLoadingRecipientInfo(true);
        const response = await fetch('/api/admin/banking-info-status');
        if (response.ok) {
          const data = await response.json();
          setEmployeesWithRecipient(new Set(data.employeesWithRecipient || []));
        }
      } catch (err) {
        console.error('Failed to fetch banking info status:', err);
      } finally {
        setLoadingRecipientInfo(false);
      }
    };

    fetchBankingInfo();
  }, []);

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

  const getEmployeeName = (invoice: InvoiceRecord) =>
    invoice.employees
      ? `${invoice.employees.first_name} ${invoice.employees.last_name}`
      : '-';

  const openPendingDialog = (invoice: InvoiceRecord) => {
    setSelectedInvoice(invoice);
    setPendingDialogOpen(true);
  };

  const handleAction = (id: string, action: 'approved' | 'rejected') => {
    approveInvoice.mutate({
      id,
      payload: {
        action,
        notes: notesById[id] || undefined,
      },
    }, {
      onSuccess: (response) => {
        setPendingDialogOpen(false);
        setSelectedInvoice(null);

        if (action === 'approved') {
          if (response.payroll?.success) {
            addToast({
              title: 'Invoice approved and payroll started',
              description: response.payroll.wiseTransferId
                ? `Wise transfer ${response.payroll.wiseTransferId} is now processing.`
                : 'Wise payroll execution was triggered successfully.',
              variant: 'success',
            });
            return;
          }

          if (response.payroll) {
            addToast({
              title: 'Invoice approved, but payroll needs attention',
              description: response.payroll.error || 'Automatic payroll execution did not complete.',
              variant: 'error',
            });
            return;
          }

          addToast({ title: 'Invoice approved', variant: 'success' });
          return;
        }

        addToast({ title: 'Invoice rejected', variant: 'default' });
      },
      onError: (error) => addToast({
        title: `Failed to ${action === 'approved' ? 'approve' : 'reject'} invoice`,
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'error',
      }),
    });
  };

  return (
    <div className="space-y-6 p-3">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll Approvals</h1>
          <p className="text-muted-foreground">Review and approve submitted invoices</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            addToast({
              title: 'Backfill starting...',
              description: 'Attempting to create Wise recipients for employees without recipient IDs.',
              variant: 'default',
            });
            fetch('/api/admin/backfill-wise-recipients', { method: 'POST' })
              .then((res) => res.json())
              .then((data) => {
                addToast({
                  title: 'Backfill completed',
                  description: `Successfully backfilled ${data.successful} recipients (${data.failed} failed)`,
                  variant: data.failed === 0 ? 'success' : 'error',
                });
              })
              .catch((err) => {
                addToast({
                  title: 'Backfill failed',
                  description: err instanceof Error ? err.message : 'Unknown error',
                  variant: 'error',
                });
              });
          }}
        >
          Backfill Wise Recipients
        </Button>
      </div>

      <StatCardGrid columns={4}>
        <StatCard
          label="Pending Review"
          value={stats.pending}
          icon={<Clock className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={<XCircle className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Pending Amount"
          value={formatCurrency(stats.pendingAmount)}
          icon={<DollarSign className="h-4 w-4" strokeWidth={1.5} />}
        />
      </StatCardGrid>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={<Loader2 className="h-5 w-5 animate-spin" />}
              title="Loading invoices"
              description="Retrieving payroll approval invoices and totals."
              size="sm"
            />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Failed to load invoices"
              description="Payroll approval invoices could not be retrieved. Refresh and try again."
              size="sm"
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Pending</CardTitle>
              <p className="text-xs text-muted-foreground">Double-click a row to review details and take action.</p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead column="employee" {...pendingSortHeadProps}>Employee</SortableTableHead>
                    <SortableTableHead column="invoice_number" {...pendingSortHeadProps}>Invoice #</SortableTableHead>
                    <SortableTableHead column="period" {...pendingSortHeadProps}>Period</SortableTableHead>
                    <SortableTableHead column="amount" {...pendingSortHeadProps}>Original Amount</SortableTableHead>
                    <TableHead>Source Currency</TableHead>
                    <TableHead>Converted Amount</TableHead>
                    <TableHead className="text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No pending invoices.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedPending.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        onDoubleClick={() => openPendingDialog(invoice)}
                        className="group cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>{getEmployeeName(invoice)}</span>
                            {!loadingRecipientInfo && invoice.employee_id && !employeesWithRecipient.has(invoice.employee_id) && (
                              <Badge variant="secondary" className="w-fit text-xs gap-1">
                                <AlertCircle className="h-3 w-3" />
                                No Wise recipient
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(
                            Number(invoice.net_amount || 0),
                            invoice.source_currency || 'PHP'
                          )}
                        </TableCell>
                        <TableCell>{invoice.source_currency || 'PHP'}</TableCell>
                        <TableCell>
                          {invoice.converted_amount !== null &&
                          invoice.converted_amount !== undefined &&
                          invoice.target_currency ?
                            formatCurrency(Number(invoice.converted_amount || 0), invoice.target_currency)
                          :
                            '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={(event) => {
                              event.stopPropagation();
                              openPendingDialog(invoice);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog
            open={pendingDialogOpen}
            onOpenChange={(open) => {
              setPendingDialogOpen(open);
              if (!open) {
                setSelectedInvoice(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Invoice Details
                  {selectedInvoice?.invoice_number ? ` - ${selectedInvoice.invoice_number}` : ''}
                </DialogTitle>
                <DialogDescription>
                  Review the invoice details, add notes, then approve or reject.
                </DialogDescription>
              </DialogHeader>

              {selectedInvoice ? (
                <div className="space-y-4">
                  <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/30 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Employee</p>
                      <p className="text-sm font-semibold text-foreground">{getEmployeeName(selectedInvoice)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Invoice #</p>
                      <p className="text-sm font-semibold text-foreground">{selectedInvoice.invoice_number}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Period</p>
                      <p className="text-sm text-foreground">
                        {formatDate(selectedInvoice.period_start)} – {formatDate(selectedInvoice.period_end)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Source Currency</p>
                      <p className="text-sm text-foreground">{selectedInvoice.source_currency || 'PHP'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Original Amount</p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(
                          Number(selectedInvoice.net_amount || 0),
                          selectedInvoice.source_currency || 'PHP'
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Converted Amount</p>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedInvoice.converted_amount !== null &&
                        selectedInvoice.converted_amount !== undefined &&
                        selectedInvoice.target_currency
                          ? formatCurrency(
                            Number(selectedInvoice.converted_amount || 0),
                            selectedInvoice.target_currency
                          )
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {selectedInvoice.status === 'submitted' || notesById[selectedInvoice.id] ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Notes</p>
                      <Textarea
                        rows={4}
                        value={notesById[selectedInvoice.id] || ''}
                        onChange={(event) => {
                          if (selectedInvoice.status !== 'submitted') {
                            return;
                          }

                          setNotesById((prev) => ({
                            ...prev,
                            [selectedInvoice.id]: event.target.value,
                          }));
                        }}
                        readOnly={selectedInvoice.status !== 'submitted'}
                        placeholder={
                          selectedInvoice.status === 'submitted'
                            ? 'Add context for approval/rejection...'
                            : 'Notes are read-only for processed invoices.'
                        }
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              <DialogFooter className="gap-2 sm:justify-end">
                {selectedInvoice?.status === 'submitted' ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => selectedInvoice && handleAction(selectedInvoice.id, 'rejected')}
                      disabled={approveInvoice.isPending || !selectedInvoice}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      variant="success"
                      onClick={() => selectedInvoice && handleAction(selectedInvoice.id, 'approved')}
                      disabled={approveInvoice.isPending || !selectedInvoice}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setPendingDialogOpen(false)}>
                    <XCircle className="h-4 w-4" />
                    Close
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                    <SortableTableHead column="amount" {...processedSortHeadProps}>Original Amount</SortableTableHead>
                    <TableHead>Source Currency</TableHead>
                    <TableHead>Converted Amount</TableHead>
                    <SortableTableHead column="approved_at" {...processedSortHeadProps}>Approved At</SortableTableHead>
                    <TableHead className="text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processed.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No processed invoices.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedProcessed.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        onDoubleClick={() => openPendingDialog(invoice)}
                        className="group cursor-pointer transition-colors hover:bg-muted/50"
                      >
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
                        <TableCell>
                          {formatCurrency(
                            Number(invoice.net_amount || 0),
                            invoice.source_currency || 'PHP'
                          )}
                        </TableCell>
                        <TableCell>{invoice.source_currency || 'PHP'}</TableCell>
                        <TableCell>
                          {invoice.converted_amount !== null &&
                          invoice.converted_amount !== undefined &&
                          invoice.target_currency ?
                            formatCurrency(Number(invoice.converted_amount || 0), invoice.target_currency)
                          :
                            '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(invoice.approved_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={(event) => {
                              event.stopPropagation();
                              openPendingDialog(invoice);
                            }}
                          >
                            View
                          </Button>
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
