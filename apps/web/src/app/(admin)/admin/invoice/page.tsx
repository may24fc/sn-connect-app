'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { useEmployees } from '@/hooks/useEmployees';
import { type InvoiceRecord, useInvoiceExchangeRateToAud, useInvoices } from '@/hooks/useInvoices';
import { useInvoicesRealtime } from '@/hooks/useInvoicesRealtime';
import {
  formatPayoutScheduleLabel,
  getCurrentPayoutKey,
  getPayoutScheduleOptions,
  parsePayoutScheduleTag,
} from '@/lib/payroll/payoutSchedule';
import { useTableSort } from '@/hooks/useTableSort';
import { formatDate, formatDateRange } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  InvoiceStatusBadge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SectionTooltip,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hr-portal/ui';
import type { InvoiceStatus } from '@hr-portal/ui';
import { AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Eye, FileText, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const MANUAL_PHP_TO_AUD_RATE_STORAGE_KEY = 'admin-invoice-manual-php-to-aud-rate';

type SubmittedInvoiceWithPayout = {
  invoiceId: string;
  employeeId: string;
  invoiceNumber: string;
  submittedAt: string | null;
  amount: number;
  currency: string;
  payoutKey: string;
  payoutLabel: string;
};

function formatCurrency(value: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
    maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
  }).format(value);
}

function getInitials(firstName: string | null | undefined, lastName: string | null | undefined): string {
  const first = firstName?.trim()?.charAt(0) ?? '';
  const last = lastName?.trim()?.charAt(0) ?? '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || 'NA';
}

function getAvatarUrl(employee: unknown): string | undefined {
  if (!(employee && typeof employee === 'object')) {
    return undefined;
  }

  const employeeRecord = employee as {
    users?: { avatar_url?: string | null } | Array<{ avatar_url?: string | null }>;
  };

  const users = employeeRecord.users;
  if (Array.isArray(users)) {
    return users[0]?.avatar_url ?? undefined;
  }

  return users?.avatar_url ?? undefined;
}

function extractUserNotes(notes: string | null | undefined): string {
  if (!notes) return '';
  return notes
    .split('\n')
    .filter((line) => !line.trim().startsWith('PAYOUT_SCHEDULE:'))
    .join('\n')
    .trim();
}

type DetailDialogRow = {
  invoice: InvoiceRecord;
  employeeName: string;
  avatarUrl: string | undefined;
  department: string;
  payoutLabel: string;
};

function AdminInvoiceDetailDialog({
  row,
  open,
  onOpenChange,
}: {
  row: DetailDialogRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!open || !row?.invoice?.document_id) {
      setPreviewUrl(null);
      setPreviewMimeType('');
      return;
    }

    setPreviewLoading(true);
    setPreviewUrl(null);

    fetch(`/api/invoices/${row.invoice.id}/document`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { url?: string; mimeType?: string } | null) => {
        if (data?.url) {
          setPreviewUrl(data.url);
          setPreviewMimeType(data.mimeType ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
  }, [open, row?.invoice?.id, row?.invoice?.document_id]);

  if (!row) return null;
  const { invoice, employeeName, avatarUrl, department, payoutLabel } = row;
  const sourceCurrency = invoice.source_currency || 'PHP';
  const userNotes = extractUserNotes(invoice.notes);
  const nameParts = employeeName.split(' ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh] p-0 gap-0 overflow-hidden [&>button:last-child]:!text-white [&>button:last-child]:!bg-zinc-700/60">
        <DialogHeader className="sr-only">
          <DialogTitle>Invoice Details — {invoice.invoice_number}</DialogTitle>
          <DialogDescription>Invoice submission details for {employeeName}</DialogDescription>
        </DialogHeader>

        {/* Dark header */}
        <div className="bg-zinc-900 px-6 pt-5 pb-5 pr-14">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-zinc-400 tracking-wide mb-1.5">Amount</p>
              <p className="text-3xl font-bold text-white tabular-nums leading-tight">
                {formatCurrency(Number(invoice.net_amount || 0), sourceCurrency)}
              </p>
              <p className="mt-2 text-sm text-zinc-400 tracking-tight">{invoice.invoice_number}</p>
            </div>
            <span className="shrink-0 mt-0.5">
              <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Employee */}
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={employeeName} />}
              <AvatarFallback>{getInitials(nameParts[0], nameParts.slice(1).join(' '))}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{employeeName}</p>
              <p className="text-xs text-muted-foreground">{department}</p>
            </div>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-2">
            {payoutLabel && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-muted-foreground shrink-0">Payout Schedule</span>
                <span className="text-sm font-medium text-right">{payoutLabel}</span>
              </div>
            )}
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm text-muted-foreground shrink-0">Period</span>
              <span className="text-sm font-medium text-right">{formatDateRange(invoice.period_start, invoice.period_end)}</span>
            </div>
            {invoice.submitted_at && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-muted-foreground shrink-0">Submitted</span>
                <span className="text-sm font-medium text-right">{formatDate(invoice.submitted_at)}</span>
              </div>
            )}
            {invoice.converted_amount && sourceCurrency !== (invoice.target_currency || sourceCurrency) && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-muted-foreground shrink-0">Converted Amount</span>
                <span className="text-sm font-medium text-right">
                  {formatCurrency(Number(invoice.converted_amount), invoice.target_currency || 'AUD')}
                </span>
              </div>
            )}
          </div>

          {/* User notes */}
          {userNotes && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-4 py-3">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-wide mb-1">Notes</p>
              <p className="text-sm">{userNotes}</p>
            </div>
          )}

          {/* Line items */}
          {invoice.invoice_line_items && invoice.invoice_line_items.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground tracking-wide mb-2">Line Items</p>
              <div className="space-y-1.5">
                {invoice.invoice_line_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">{item.description}</span>
                    <span className="font-medium tabular-nums shrink-0">{formatCurrency(item.total, sourceCurrency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Document Preview */}
          {invoice.document_id && (
            <div>
              <p className="text-[10px] font-bold text-zinc-400 tracking-wide mb-2">Invoice Document</p>
              {previewLoading && (
                <div className="flex items-center justify-center h-40 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!previewLoading && previewUrl && previewMimeType.startsWith('image/') && (
                <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <img src={previewUrl} alt="Invoice document" className="w-full object-contain max-h-64" />
                </div>
              )}
              {!previewLoading && previewUrl && !previewMimeType.startsWith('image/') && (
                <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 h-64">
                  <iframe src={previewUrl} className="w-full h-full" title="Invoice document preview" />
                </div>
              )}
              {!previewLoading && previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in new tab
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminInvoicePage() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'matrix' | 'conversion'>('matrix');
  const pageSize = 10;
  const [conversionCurrency, setConversionCurrency] = useState<'AUD'>('AUD');
  const [manualConversionRateInput, setManualConversionRateInput] = useState<string>('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<DetailDialogRow | null>(null);

  useEffect(() => {
    const storedRate = window.localStorage.getItem(MANUAL_PHP_TO_AUD_RATE_STORAGE_KEY);

    if (storedRate) {
      setManualConversionRateInput(storedRate);
    }
  }, []);

  useEffect(() => {
    if (!manualConversionRateInput.trim()) {
      window.localStorage.removeItem(MANUAL_PHP_TO_AUD_RATE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(MANUAL_PHP_TO_AUD_RATE_STORAGE_KEY, manualConversionRateInput);
  }, [manualConversionRateInput]);

  useInvoicesRealtime();

  const { data: invoicesData, isLoading: invoicesLoading, error: invoicesError } = useInvoices({
    page: 1,
    pageSize: 1000,
  });
  const { data: employeesData, isLoading: employeesLoading, error: employeesError } = useEmployees({
    page,
    pageSize,
    excludeInterns: true,
  });

  const [payoutFilter, setPayoutFilter] = useState<string>(() => getCurrentPayoutKey());

  const submittedInvoicesWithPayout = useMemo<Array<SubmittedInvoiceWithPayout>>(() => {
    const invoices = invoicesData?.data || [];

    return invoices
      .filter((invoice) => invoice.status === 'submitted')
      .map((invoice) => {
        const parsed = parsePayoutScheduleTag(invoice.notes);

        return {
          invoiceId: invoice.id,
          employeeId: invoice.employee_id,
          invoiceNumber: invoice.invoice_number,
          submittedAt: invoice.submitted_at,
          amount: Number(invoice.net_amount || 0),
          currency: (invoice.source_currency || invoice.target_currency || 'PHP').toUpperCase(),
          payoutKey: parsed?.key ?? '',
          payoutLabel: parsed
            ? formatPayoutScheduleLabel(parsed.monthKey, parsed.sequence)
            : '',
        };
      });
  }, [invoicesData?.data]);

  const payoutFilterOptions = useMemo(() => {
    const map = new Map<string, string>();

    // Keep current and next payout schedules selectable even with no submissions yet.
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const baselineOptions = [
      ...getPayoutScheduleOptions(now),
      ...getPayoutScheduleOptions(nextMonth),
    ];

    for (const option of baselineOptions) {
      map.set(option.key, option.label);
    }

    for (const row of submittedInvoicesWithPayout) {
      if (row.payoutKey && row.payoutLabel) {
        map.set(row.payoutKey, row.payoutLabel);
      }
    }

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      // Sort descending: most recent payout first (key format `YYYY-MM:N` sorts lexicographically).
      .sort((a, b) => b.value.localeCompare(a.value));
  }, [submittedInvoicesWithPayout]);

  const effectivePayoutFilter =
    payoutFilterOptions.some((option) => option.value === payoutFilter)
      ? payoutFilter
      : (payoutFilterOptions[0]?.value ?? '');

  const submittedByEmployeeForFilter = useMemo(() => {
    const scoped = effectivePayoutFilter
      ? submittedInvoicesWithPayout.filter((row) => row.payoutKey === effectivePayoutFilter)
      : submittedInvoicesWithPayout;

    // Keep latest submission per employee.
    const byEmployee = new Map<string, SubmittedInvoiceWithPayout>();

    for (const row of scoped) {
      const existing = byEmployee.get(row.employeeId);
      const rowTime = row.submittedAt ? new Date(row.submittedAt).getTime() : 0;
      const existingTime = existing?.submittedAt ? new Date(existing.submittedAt).getTime() : 0;

      if (!existing || rowTime >= existingTime) {
        byEmployee.set(row.employeeId, row);
      }
    }

    return byEmployee;
  }, [effectivePayoutFilter, submittedInvoicesWithPayout]);

  const employeeRows = useMemo(() => {
    const employees = employeesData?.data || [];

    return employees.map((employee) => {
      const matchedInvoice = submittedByEmployeeForFilter.get(employee.id);

      return {
        employee,
        matchedInvoice,
        hasSubmitted: !!matchedInvoice,
      };
    });
  }, [employeesData?.data, submittedByEmployeeForFilter]);

  const invoiceById = useMemo(() => {
    const map = new Map<string, InvoiceRecord>();
    for (const inv of invoicesData?.data ?? []) {
      map.set(inv.id, inv);
    }
    return map;
  }, [invoicesData?.data]);

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({
    initialColumn: 'employee',
  });

  const sortedRows = sortItems(employeeRows, {
    employee: (row) => `${row.employee.first_name} ${row.employee.last_name}`.toLowerCase(),
    department: (row) => row.employee.department ?? '',
    invoice_number: (row) => row.matchedInvoice?.invoiceNumber ?? '',
    amount: (row) => row.matchedInvoice?.amount ?? 0,
    status: (row) => (row.hasSubmitted ? 1 : 0),
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  const handleViewInvoice = (row: (typeof sortedRows)[number]) => {
    if (!row.hasSubmitted || !row.matchedInvoice) return;
    const invoice = invoiceById.get(row.matchedInvoice.invoiceId);
    if (!invoice) return;
    setDetailRow({
      invoice,
      employeeName: `${row.employee.first_name} ${row.employee.last_name}`,
      avatarUrl: getAvatarUrl(row.employee),
      department: row.employee.department || '-',
      payoutLabel: row.matchedInvoice.payoutLabel,
    });
    setDetailOpen(true);
  };
  const {
    data: audRateData,
    isLoading: audRateLoading,
    error: audRateError,
  } = useInvoiceExchangeRateToAud('PHP', activeTab === 'conversion');
  const liveConversionRate = audRateData?.data.exchangeRateToAud;
  const hasLiveConversionRate = typeof liveConversionRate === 'number' && liveConversionRate > 0;
  const parsedManualConversionRate = Number.parseFloat(manualConversionRateInput);
  const manualConversionRate =
    Number.isFinite(parsedManualConversionRate) && parsedManualConversionRate > 0
      ? parsedManualConversionRate
      : null;
  const effectivePhpToAudRate = hasLiveConversionRate ? liveConversionRate : manualConversionRate;
  const usingManualOverride = !hasLiveConversionRate && manualConversionRate !== null;

  const isLoading = employeesLoading || invoicesLoading;
  const hasError = !!employeesError || !!invoicesError;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold text-foreground">Invoice</h1>
            <SectionTooltip content="Track employee invoice submissions per payout schedule and create your own invoice draft." />
          </div>
          <p className="text-muted-foreground">
            All employees are listed below. Rows are highlighted when an employee has submitted for the selected payout schedule.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-[320px]">
            <Select
              value={effectivePayoutFilter}
              onValueChange={(value) => {
                setPayoutFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter payout schedule" />
              </SelectTrigger>
              <SelectContent>
                {payoutFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button asChild>
            <Link href="/admin/invoice/create">
              <Plus className="mr-2 h-4 w-4" />
              Create My Invoice
            </Link>
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'matrix' | 'conversion')}
      >
        <TabsList>
          <TabsTrigger value="matrix">Submission Matrix</TabsTrigger>
          <TabsTrigger value="conversion">Amount Conversion</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={<Loader2 className="h-5 w-5 animate-spin" />}
              title="Loading employee invoice matrix"
              description="Retrieving employees and invoice submissions."
              size="sm"
            />
          </CardContent>
        </Card>
      ) : hasError ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Failed to load invoice submissions"
              description="Employee and invoice data could not be retrieved. Refresh and try again."
              size="sm"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {activeTab === 'matrix' ? 'Invoice Submission Matrix' : 'Amount Conversion'}
                {activeTab === 'conversion' && usingManualOverride && (
                  <Badge variant="secondary" className="ml-2 align-middle">
                    Manual override
                  </Badge>
                )}
                {employeesData?.pagination && (
                  <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400 ml-2">
                    ({employeesData.pagination.total} total)
                  </span>
                )}
              </CardTitle>

              {employeesData?.pagination && employeesData.pagination.totalPages > 1 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {(page - 1) * pageSize + 1}-
                    {Math.min(page * pageSize, employeesData.pagination.total)} of {employeesData.pagination.total}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Previous page"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Next page"
                      onClick={() =>
                        setPage(Math.min(employeesData.pagination.totalPages, page + 1))
                      }
                      disabled={page >= employeesData.pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {activeTab === 'conversion' && (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="w-full sm:w-[180px]">
                  <Select
                    value={conversionCurrency}
                    onValueChange={(value) => setConversionCurrency(value as 'AUD')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUD">AUD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-[200px]">
                  <Input
                    type={hasLiveConversionRate || audRateLoading ? 'text' : 'number'}
                    min={hasLiveConversionRate || audRateLoading ? undefined : '0'}
                    step={hasLiveConversionRate || audRateLoading ? undefined : '0.0001'}
                    inputMode={hasLiveConversionRate || audRateLoading ? undefined : 'decimal'}
                    value={
                      audRateLoading
                        ? 'Loading...'
                        : hasLiveConversionRate
                          ? liveConversionRate.toFixed(4)
                          : manualConversionRateInput
                    }
                    onChange={(event) => setManualConversionRateInput(event.target.value)}
                    readOnly={audRateLoading || hasLiveConversionRate}
                    placeholder={hasLiveConversionRate ? 'Live PHP to AUD rate' : 'Enter manual rate'}
                    aria-label="PHP to AUD conversion rate"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>
                    {hasLiveConversionRate
                      ? 'Converted amount uses the live PHP to AUD mid-market rate from Wise.'
                      : usingManualOverride
                        ? 'Manual override is active. Converted amounts use the saved PHP to AUD rate you entered.'
                        : 'Wise is unavailable. Enter a manual PHP to AUD rate to continue converting amounts.'}
                  </p>
                  {audRateData?.data.fxRatesFetchedAt && (
                    <p>
                      Source: {audRateData.data.fxSource} · Updated {new Date(audRateData.data.fxRatesFetchedAt).toLocaleString()}
                    </p>
                  )}
                  {!hasLiveConversionRate && manualConversionRateInput.trim() && (
                    <p>
                      Saved fallback rate: {manualConversionRate !== null ? manualConversionRate.toFixed(4) : manualConversionRateInput}
                    </p>
                  )}
                  {audRateError && (
                    <p className="text-red-600 dark:text-red-400">
                      {audRateError instanceof Error
                        ? `${audRateError.message} Enter the rate manually below.`
                        : 'Failed to load live conversion rate. Enter the rate manually below.'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'matrix' | 'conversion')}>
              <TabsContent value="matrix" className="mt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead column="employee" {...sortHeadProps}>Employee</SortableTableHead>
                      <SortableTableHead column="department" {...sortHeadProps}>Department</SortableTableHead>
                      <SortableTableHead column="invoice_number" {...sortHeadProps}>Invoice #</SortableTableHead>
                      <SortableTableHead column="amount" {...sortHeadProps}>Amount</SortableTableHead>
                      <SortableTableHead column="status" {...sortHeadProps}>Status</SortableTableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10">
                          <EmptyState
                            icon={FileText}
                            title="No employees found"
                            description="No employee records are available for invoice tracking."
                            size="sm"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedRows.map((row) => {
                        const employeeName = `${row.employee.first_name} ${row.employee.last_name}`;
                        const avatarUrl = getAvatarUrl(row.employee);

                        return (
                          <TableRow
                            key={row.employee.id}
                            className={cn(
                              'transition-colors',
                              row.hasSubmitted
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/20 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/30 cursor-pointer'
                                : 'cursor-default'
                            )}
                            onClick={() => handleViewInvoice(row)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  {avatarUrl && <AvatarImage src={avatarUrl} alt={`${employeeName} avatar`} />}
                                  <AvatarFallback>{getInitials(row.employee.first_name, row.employee.last_name)}</AvatarFallback>
                                </Avatar>
                                <span>{employeeName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{row.employee.department || '-'}</TableCell>
                            <TableCell>{row.matchedInvoice?.invoiceNumber ?? '-'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {row.matchedInvoice
                                ? row.matchedInvoice.amount > 0
                                  ? formatCurrency(row.matchedInvoice.amount, row.matchedInvoice.currency)
                                  : '-'
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {row.hasSubmitted ? (
                                <Badge variant="success">Submitted</Badge>
                              ) : (
                                <Badge variant="secondary">No submission</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {row.hasSubmitted && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-label="View invoice details"
                                  onClick={(e) => { e.stopPropagation(); handleViewInvoice(row); }}
                                >
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="conversion" className="mt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Converted Amount ({conversionCurrency})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-10">
                          <EmptyState
                            icon={FileText}
                            title="No employees found"
                            description="No employee records are available for amount conversion."
                            size="sm"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedRows.map((row) => {
                        const employeeName = `${row.employee.first_name} ${row.employee.last_name}`;
                        const avatarUrl = getAvatarUrl(row.employee);
                        const originalAmount = row.matchedInvoice?.amount ?? 0;
                        const hasAmount = !!row.matchedInvoice && originalAmount > 0;
                        const sourceCurrency = row.matchedInvoice?.currency || 'PHP';
                        const isPhpSource = sourceCurrency === 'PHP';
                        const isAudSource = sourceCurrency === 'AUD';
                        const canConvert = hasAmount && (isAudSource || (isPhpSource && effectivePhpToAudRate !== null));
                        const appliedRate = isAudSource ? 1 : (effectivePhpToAudRate ?? 0);
                        const convertedAmount = canConvert ? originalAmount * appliedRate : 0;

                        return (
                          <TableRow
                            key={`conversion-${row.employee.id}`}
                            className={cn(
                              row.hasSubmitted &&
                                'bg-emerald-50/80 dark:bg-emerald-950/20 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/30'
                            )}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  {avatarUrl && <AvatarImage src={avatarUrl} alt={`${employeeName} avatar`} />}
                                  <AvatarFallback>{getInitials(row.employee.first_name, row.employee.last_name)}</AvatarFallback>
                                </Avatar>
                                <span>{employeeName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {hasAmount
                                ? formatCurrency(originalAmount, row.matchedInvoice?.currency || 'PHP')
                                : '-'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {canConvert
                                ? formatCurrency(convertedAmount, conversionCurrency)
                                : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      <AdminInvoiceDetailDialog
        row={detailRow}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
