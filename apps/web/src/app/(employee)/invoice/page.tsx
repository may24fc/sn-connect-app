'use client';

import type { InvoiceRecord } from '@/hooks/useInvoices';
import { useCreateInvoice, useInvoices, useSubmitInvoice } from '@/hooks/useInvoices';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate, formatDateRange, formatLabel } from '@/lib/format';
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
  Input,
  Label,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { Eye, EyeOff } from 'lucide-react';
import { type FormEvent, useCallback, useMemo, useState } from 'react';
import { SortableTableHead } from '@/components/data-display/SortableTableHead';

const MASKED_AMOUNT = '••••••';

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

/* ------------------------------------------------------------------ */
/*  Detail row used in both the View and Confirm dialogs               */
/* ------------------------------------------------------------------ */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Invoice Detail Dialog (shown on row click or "View" button)        */
/* ------------------------------------------------------------------ */
function InvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
  showAmounts,
}: {
  invoice: InvoiceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showAmounts: boolean;
}) {
  const amount = (v: number) => (showAmounts ? formatCurrency(v) : MASKED_AMOUNT);
  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
          <DialogDescription className="sr-only">
            Details for invoice {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <DetailRow label="Invoice #" value={invoice.invoice_number} />
          <DetailRow label="Status" value={formatLabel(invoice.status)} />
          <Separator className="my-2" />
          <DetailRow
            label="Period"
            value={formatDateRange(invoice.period_start, invoice.period_end)}
          />
          <DetailRow
            label="Gross Amount"
            value={amount(Number(invoice.gross_amount || 0))}
          />
          <DetailRow label="Deductions" value={amount(Number(invoice.deductions || 0))} />
          <Separator className="my-2" />
          <DetailRow
            label="Net Amount"
            value={amount(Number(invoice.net_amount || 0))}
          />
          {invoice.notes && <DetailRow label="Notes" value={invoice.notes} />}
          <Separator className="my-2" />
          <DetailRow label="Created" value={formatDate(invoice.created_at)} />
          {invoice.submitted_at && (
            <DetailRow label="Submitted" value={formatDate(invoice.submitted_at)} />
          )}
          {invoice.approved_at && (
            <DetailRow label="Approved" value={formatDate(invoice.approved_at)} />
          )}
          {invoice.paid_at && <DetailRow label="Paid" value={formatDate(invoice.paid_at)} />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Submit Confirmation Dialog                                         */
/* ------------------------------------------------------------------ */
function SubmitConfirmDialog({
  invoice,
  open,
  onOpenChange,
  onConfirm,
  isPending,
  showAmounts,
}: {
  invoice: InvoiceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  showAmounts: boolean;
}) {
  const amount = (v: number) => (showAmounts ? formatCurrency(v) : MASKED_AMOUNT);
  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm Submission</DialogTitle>
          <DialogDescription>
            Please review the invoice details before submitting. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
          <DetailRow label="Invoice #" value={invoice.invoice_number} />
          <Separator className="my-2" />
          <DetailRow
            label="Period"
            value={formatDateRange(invoice.period_start, invoice.period_end)}
          />
          <DetailRow
            label="Gross Amount"
            value={amount(Number(invoice.gross_amount || 0))}
          />
          <DetailRow label="Deductions" value={amount(Number(invoice.deductions || 0))} />
          <Separator className="my-2" />
          <DetailRow
            label="Net Amount"
            value={amount(Number(invoice.net_amount || 0))}
          />
          {invoice.notes && <DetailRow label="Notes" value={invoice.notes} />}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Submitting...' : 'Confirm & Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function InvoicePage() {
  const { addToast } = useToast();

  // Amount visibility toggle
  const [showAmounts, setShowAmounts] = useState(true);

  // Create invoice dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [grossAmount, setGrossAmount] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [notes, setNotes] = useState('');

  // Detail / View dialog
  const [detailInvoice, setDetailInvoice] = useState<InvoiceRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Submit confirmation dialog
  const [confirmInvoice, setConfirmInvoice] = useState<InvoiceRecord | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, error } = useInvoices({ page: 1, pageSize: 100 });
  const createInvoice = useCreateInvoice();
  const submitInvoice = useSubmitInvoice();

  const invoices = data?.data || [];

  const invoiceStatusOrder: Record<string, number> = { draft: 0, submitted: 1, rejected: 2, approved: 3, paid: 4 };

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({ initialColumn: 'created_at', initialDirection: 'desc' });

  const sortedInvoices = sortItems(invoices, {
    invoice_number: (i) => i.invoice_number,
    period: (i) => i.period_start ?? '',
    gross: (i) => Number(i.gross_amount || 0),
    net: (i) => Number(i.net_amount || 0),
    status: (i) => invoiceStatusOrder[i.status] ?? 99,
    created_at: (i) => i.created_at ?? '',
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  const stats = useMemo(() => {
    const approved = invoices.filter((invoice) => ['approved', 'paid'].includes(invoice.status));

    return {
      total: invoices.length,
      pending: invoices.filter((invoice) => invoice.status === 'submitted').length,
      approved: approved.length,
      totalApprovedAmount: approved.reduce(
        (sum, invoice) => sum + Number(invoice.net_amount || 0),
        0
      ),
    };
  }, [invoices]);

  const resetForm = useCallback(() => {
    setPeriodStart('');
    setPeriodEnd('');
    setGrossAmount('0');
    setDeductions('0');
    setNotes('');
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const gross = Number(grossAmount || 0);
    const deductionValue = Number(deductions || 0);
    const net = gross - deductionValue;

    try {
      await createInvoice.mutateAsync({
        periodStart,
        periodEnd,
        grossAmount: gross,
        deductions: deductionValue,
        netAmount: net,
        status: 'draft',
        notes: notes || undefined,
        lineItems: [],
        sourceCurrency: 'PHP',
        targetCurrency: 'PHP',
      });

      addToast({
        title: 'Invoice created',
        description: 'Invoice has been saved as draft with an auto-generated number.',
        variant: 'success',
      });

      setCreateOpen(false);
      resetForm();
    } catch (_err) {
      addToast({
        title: 'Error',
        description: 'Failed to create invoice',
        variant: 'error',
      });
    }
  };

  const handleRowClick = (invoice: InvoiceRecord) => {
    setDetailInvoice(invoice);
    setDetailOpen(true);
  };

  const handleSubmitClick = (invoice: InvoiceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmInvoice(invoice);
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = () => {
    if (!confirmInvoice) return;

    submitInvoice.mutate(confirmInvoice.id, {
      onSuccess: () => {
        addToast({
          title: 'Invoice submitted',
          description: `Invoice ${confirmInvoice.invoice_number} has been submitted for approval.`,
          variant: 'success',
        });
        setConfirmOpen(false);
        setConfirmInvoice(null);
      },
      onError: () => {
        addToast({
          title: 'Error',
          description: 'Failed to submit invoice',
          variant: 'error',
        });
      },
    });
  };

  const handleViewClick = (invoice: InvoiceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setDetailInvoice(invoice);
    setDetailOpen(true);
  };

  const maskedCurrency = (value: number) => (showAmounts ? formatCurrency(value) : MASKED_AMOUNT);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoice</h1>
          <p className="text-muted-foreground">Submit and monitor your invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAmounts((prev) => !prev)}
            title={showAmounts ? 'Hide amounts' : 'Show amounts'}
          >
            {showAmounts ? <Eye className="h-4 w-4 mr-1.5" /> : <EyeOff className="h-4 w-4 mr-1.5" />}
            {showAmounts ? 'Hide Amounts' : 'Show Amounts'}
          </Button>
          <Button onClick={() => setCreateOpen(true)}>Create Invoice</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
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
            <CardTitle className="text-sm">Approved/Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{maskedCurrency(stats.totalApprovedAmount)}</p>
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="invoice_number" {...sortHeadProps}>Invoice #</SortableTableHead>
                  <SortableTableHead column="period" {...sortHeadProps}>Period</SortableTableHead>
                  <SortableTableHead column="gross" {...sortHeadProps}>Gross</SortableTableHead>
                  <SortableTableHead column="net" {...sortHeadProps}>Net</SortableTableHead>
                  <SortableTableHead column="status" {...sortHeadProps}>Status</SortableTableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No invoices yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleRowClick(invoice)}
                    >
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateRange(invoice.period_start, invoice.period_end)}
                      </TableCell>
                      <TableCell>{maskedCurrency(Number(invoice.gross_amount || 0))}</TableCell>
                      <TableCell>{maskedCurrency(Number(invoice.net_amount || 0))}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[invoice.status]}>
                          {formatLabel(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {invoice.status === 'draft' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleViewClick(invoice, e)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => handleSubmitClick(invoice, e)}
                                disabled={submitInvoice.isPending}
                              >
                                Submit
                              </Button>
                            </>
                          )}
                          {invoice.status !== 'draft' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleViewClick(invoice, e)}
                            >
                              <Eye className="h-4 w-4" />
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

      {/* ---- Create Invoice Dialog ---- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>
              Fill in the details below. An invoice number will be assigned automatically.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Gross Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={grossAmount}
                  onChange={(event) => setGrossAmount(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Deductions</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductions}
                  onChange={(event) => setDeductions(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(event) => setPeriodStart(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(event) => setPeriodEnd(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Net Amount</span>
                <span className="font-semibold text-base">
                  {formatCurrency(
                    Math.max(0, Number(grossAmount || 0) - Number(deductions || 0))
                  )}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createInvoice.isPending}>
                {createInvoice.isPending ? 'Saving...' : 'Save Draft'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- Invoice Detail Dialog ---- */}
      <InvoiceDetailDialog
        invoice={detailInvoice}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        showAmounts={showAmounts}
      />

      {/* ---- Submit Confirmation Dialog ---- */}
      <SubmitConfirmDialog
        invoice={confirmInvoice}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmSubmit}
        isPending={submitInvoice.isPending}
        showAmounts={showAmounts}
      />
    </div>
  );
}
