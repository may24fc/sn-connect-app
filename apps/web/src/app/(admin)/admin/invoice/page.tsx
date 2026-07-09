'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { useEmployees } from '@/hooks/useEmployees';
import { useInvoices } from '@/hooks/useInvoices';
import {
  formatPayoutScheduleLabel,
  getPayoutScheduleOptions,
  parsePayoutScheduleTag,
} from '@/lib/payroll/payoutSchedule';
import { useTableSort } from '@/hooks/useTableSort';
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
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SectionTooltip,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@hr-portal/ui';
import { AlertCircle, ChevronLeft, ChevronRight, FileText, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

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

export default function AdminInvoicePage() {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: invoicesData, isLoading: invoicesLoading, error: invoicesError } = useInvoices({
    page: 1,
    pageSize: 1000,
  });
  const { data: employeesData, isLoading: employeesLoading, error: employeesError } = useEmployees({
    page,
    pageSize,
  });

  const [payoutFilter, setPayoutFilter] = useState<string>('all');

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
          payoutKey: parsed?.key ?? 'unassigned',
          payoutLabel: parsed
            ? formatPayoutScheduleLabel(parsed.monthKey, parsed.sequence)
            : 'Unassigned Schedule',
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
      map.set(row.payoutKey, row.payoutLabel);
    }

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [submittedInvoicesWithPayout]);

  const effectivePayoutFilter =
    payoutFilter === 'all' || payoutFilterOptions.some((option) => option.value === payoutFilter)
      ? payoutFilter
      : 'all';

  const submittedByEmployeeForFilter = useMemo(() => {
    const scoped =
      effectivePayoutFilter === 'all'
        ? submittedInvoicesWithPayout
        : submittedInvoicesWithPayout.filter((row) => row.payoutKey === effectivePayoutFilter);

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
                <SelectItem value="all">All payout schedules</SelectItem>
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
                Invoice Submission Matrix
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
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="employee" {...sortHeadProps}>Employee</SortableTableHead>
                  <SortableTableHead column="department" {...sortHeadProps}>Department</SortableTableHead>
                  <SortableTableHead column="invoice_number" {...sortHeadProps}>Invoice #</SortableTableHead>
                  <SortableTableHead column="amount" {...sortHeadProps}>Amount</SortableTableHead>
                  <SortableTableHead column="status" {...sortHeadProps}>Status</SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10">
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
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
