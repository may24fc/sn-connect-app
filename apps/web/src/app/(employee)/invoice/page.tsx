'use client';

import type { InvoiceRecord } from '@/hooks/useInvoices';
import { useCreateInvoice, useInvoices, useSubmitInvoice } from '@/hooks/useInvoices';
import { convertAmount, getExchangeRateText } from '@/lib/fx/rates';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate, formatDateRange } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
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
  CurrencySelector,
  Input,
  InvoiceStatusBadge,
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
import type { InvoiceStatus } from '@hr-portal/ui';
import { CheckCircle2, Download, Eye, EyeOff } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { SortableTableHead } from '@/components/data-display/SortableTableHead';

const MASKED_AMOUNT = '••••••';

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
  if (!invoice) return null;

  const sourceCurrency = invoice.source_currency || 'PHP';
  const targetCurrency = invoice.target_currency || 'PHP';
  const amount = (v: number, currencyCode = sourceCurrency) =>
    showAmounts ? formatCurrency(v, currencyCode) : MASKED_AMOUNT;

  const timelineSteps = [
    { label: 'Created',   date: invoice.created_at,   done: true },
    { label: 'Submitted', date: invoice.submitted_at, done: !!invoice.submitted_at },
    { label: 'Approved',  date: invoice.approved_at,  done: !!invoice.approved_at },
    ...(invoice.paid_at ? [{ label: 'Paid', date: invoice.paid_at, done: true }] : []),
  ];

  const handleDownloadPDF = () => { window.print(); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md p-0 gap-0 overflow-hidden [&>button:last-child]:!text-white [&>button:last-child]:!bg-zinc-700/60"
      >
        {/* Accessibility tokens — visually hidden */}
        <DialogTitle className="sr-only">
          Invoice Details — {invoice.invoice_number}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Details for invoice {invoice.invoice_number}
        </DialogDescription>

        {/* ── Dark Header ── */}
        <div className="bg-zinc-900 px-6 pt-5 pb-5 pr-14">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">
                Net Amount
              </p>
              <p className="text-3xl font-bold text-white tabular-nums leading-tight">
                {amount(Number(invoice.net_amount || 0))}
              </p>
              <p className="mt-2 text-sm text-zinc-400 tracking-tight">
                {invoice.invoice_number}
              </p>
            </div>
            <span className="shrink-0 mt-0.5">
              <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
            </span>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Period: {formatDateRange(invoice.period_start, invoice.period_end)}
          </p>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-5">

          {/* Financial Summary Card */}
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-4 py-3 space-y-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
              Financial Summary
            </p>
            {invoice.hourly_rate && invoice.hours_worked && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hourly Rate</span>
                  <span className="text-sm font-medium tabular-nums">
                    {amount(Number(invoice.hourly_rate), sourceCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hours Worked</span>
                  <span className="text-sm font-medium tabular-nums">
                    {showAmounts ? invoice.hours_worked : MASKED_AMOUNT}
                  </span>
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2" />
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Gross Amount</span>
              <span className="text-sm font-medium tabular-nums">
                {amount(Number(invoice.gross_amount || 0), sourceCurrency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Deductions</span>
              <span className="text-sm font-medium tabular-nums text-red-600 dark:text-red-400">
                {showAmounts
                  ? `\u2212${formatCurrency(Number(invoice.deductions || 0), sourceCurrency)}`
                  : MASKED_AMOUNT}
              </span>
            </div>
            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Net Amount</span>
              <span className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-400">
                {amount(Number(invoice.net_amount || 0), sourceCurrency)}
              </span>
            </div>
            {invoice.converted_amount && sourceCurrency !== targetCurrency && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Converted Amount</span>
                <span className="text-sm font-medium tabular-nums">
                  {amount(Number(invoice.converted_amount || 0), targetCurrency)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-4 py-3">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">
                Notes
              </p>
              <p className="text-sm text-foreground">{invoice.notes}</p>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
              Timeline
            </p>
            <div className="relative">
              {timelineSteps.map((step, index) => (
                <div key={step.label} className="flex gap-3">
                  {/* Dot + vertical line column */}
                  <div className="relative flex flex-col items-center">
                    <div
                      className={cn(
                        'relative z-10 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full',
                        step.done
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-700',
                      )}
                    >
                      {step.done ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                      )}
                    </div>
                    {index < timelineSteps.length - 1 && (
                      <div
                        className={cn(
                          'w-px flex-1 mt-1 min-h-[1.5rem]',
                          step.done ? 'bg-emerald-400' : 'bg-zinc-200 dark:bg-zinc-700',
                        )}
                      />
                    )}
                  </div>
                  {/* Step text */}
                  <div className={cn('min-w-0', index < timelineSteps.length - 1 ? 'pb-4' : 'pb-0')}>
                    <p
                      className={cn(
                        'text-sm font-medium leading-tight',
                        step.done ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                      {step.date ? formatDate(step.date) : '\u2014'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={handleDownloadPDF}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
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
  if (!invoice) return null;

  const sourceCurrency = invoice.source_currency || 'PHP';
  const targetCurrency = invoice.target_currency || 'PHP';
  const amount = (v: number, currencyCode = sourceCurrency) =>
    showAmounts ? formatCurrency(v, currencyCode) : MASKED_AMOUNT;

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
            value={amount(Number(invoice.gross_amount || 0), sourceCurrency)}
          />
          <DetailRow
            label="Deductions"
            value={amount(Number(invoice.deductions || 0), sourceCurrency)}
          />
          <Separator className="my-2" />
          <DetailRow
            label="Net Amount"
            value={amount(Number(invoice.net_amount || 0), sourceCurrency)}
          />
          {invoice.converted_amount && sourceCurrency !== targetCurrency && (
            <DetailRow
              label="Converted Amount"
              value={amount(Number(invoice.converted_amount || 0), targetCurrency)}
            />
          )}
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
  const [hourlyRate, setHourlyRate] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [grossAmount, setGrossAmount] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [notes, setNotes] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState('PHP');
  const [targetCurrency, setTargetCurrency] = useState('PHP');
  const [exchangeRate, setExchangeRate] = useState<number | null>(1);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(0);
  const [exchangeRateText, setExchangeRateText] = useState('');

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
    setHourlyRate('');
    setHoursWorked('');
    setGrossAmount('0');
    setDeductions('0');
    setNotes('');
    setSourceCurrency('PHP');
    setTargetCurrency('PHP');
    setExchangeRate(1);
    setConvertedAmount(0);
    setExchangeRateText('');
  }, []);

  // Auto-calculate gross amount from hourly rate × hours worked
  useEffect(() => {
    const rate = Number(hourlyRate || 0);
    const hours = Number(hoursWorked || 0);
    if (rate > 0 && hours > 0) {
      setGrossAmount(String(Math.round(rate * hours * 100) / 100));
    }
  }, [hourlyRate, hoursWorked]);

  useEffect(() => {
    let cancelled = false;

    async function updateFxPreview() {
      const netAmount = Math.max(0, Number(grossAmount || 0) - Number(deductions || 0));

      if (sourceCurrency === targetCurrency) {
        if (!cancelled) {
          setExchangeRate(1);
          setConvertedAmount(netAmount);
          setExchangeRateText(`1 ${sourceCurrency} = 1 ${targetCurrency}`);
        }
        return;
      }

      try {
        const [text, amount] = await Promise.all([
          getExchangeRateText(sourceCurrency, targetCurrency),
          convertAmount(netAmount, sourceCurrency, targetCurrency),
        ]);

        if (cancelled) return;

        setExchangeRateText(text);
        setConvertedAmount(amount);

        const rateMatch = text.match(/=\s*([\d.]+)/);
        setExchangeRate(rateMatch ? Number(rateMatch[1]) : null);
      } catch {
        if (!cancelled) {
          setExchangeRate(null);
          setConvertedAmount(null);
          setExchangeRateText('Exchange rates unavailable');
        }
      }
    }

    void updateFxPreview();

    return () => {
      cancelled = true;
    };
  }, [deductions, grossAmount, sourceCurrency, targetCurrency]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const gross = Number(grossAmount || 0);
    const deductionValue = Number(deductions || 0);
    const net = gross - deductionValue;

    try {
      await createInvoice.mutateAsync({
        periodStart,
        periodEnd,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        hoursWorked: hoursWorked ? Number(hoursWorked) : null,
        grossAmount: gross,
        deductions: deductionValue,
        netAmount: net,
        status: 'draft',
        notes: notes || undefined,
        lineItems: [],
        sourceCurrency,
        targetCurrency,
        exchangeRate,
        convertedAmount,
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

  const maskedCurrency = (value: number, currencyCode = 'PHP') =>
    showAmounts ? formatCurrency(value, currencyCode) : MASKED_AMOUNT;

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
                      <TableCell>
                        {maskedCurrency(
                          Number(invoice.gross_amount || 0),
                          invoice.source_currency || 'PHP'
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span>
                            {maskedCurrency(
                              Number(invoice.net_amount || 0),
                              invoice.source_currency || 'PHP'
                            )}
                          </span>
                          {invoice.converted_amount !== null &&
                            invoice.converted_amount !== undefined &&
                            invoice.source_currency &&
                            invoice.target_currency &&
                            invoice.source_currency !== invoice.target_currency && (
                              <span className="block text-xs text-muted-foreground">
                                ≈ {maskedCurrency(Number(invoice.converted_amount || 0), invoice.target_currency)}
                              </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.status as InvoiceStatus} size="sm" />
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
                <Label>Source Currency</Label>
                <CurrencySelector
                  value={sourceCurrency}
                  onChange={setSourceCurrency}
                  {...(sourceCurrency !== targetCurrency && exchangeRateText
                    ? { exchangeRateText }
                    : {})}
                />
              </div>
              <div className="space-y-2">
                <Label>Base Currency</Label>
                <CurrencySelector value={targetCurrency} onChange={setTargetCurrency} />
              </div>
              <div className="space-y-2">
                <Label>Hourly Rate</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={hourlyRate}
                  onChange={(event) => setHourlyRate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hours Worked</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={hoursWorked}
                  onChange={(event) => setHoursWorked(event.target.value)}
                />
              </div>
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
                {Number(hourlyRate || 0) > 0 && Number(hoursWorked || 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated: {hourlyRate} × {hoursWorked} hrs
                  </p>
                )}
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
                    Math.max(0, Number(grossAmount || 0) - Number(deductions || 0)),
                    sourceCurrency
                  )}
                </span>
              </div>
              {sourceCurrency !== targetCurrency && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Converted Amount</span>
                  <span className="font-semibold text-base">
                    {convertedAmount !== null
                      ? formatCurrency(Number(convertedAmount || 0), targetCurrency)
                      : '—'}
                  </span>
                </div>
              )}
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
