'use client';

import { type InvoiceRecord, useApproveInvoice, useInvoices } from '@/hooks/useInvoices';
import { formatFinanceDateRange } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FilterSearchInput, FilterSelect } from '@/components/data-display/FilterControls';
import { PaginationBar } from '@/components/data-display/PaginationBar';
import { Button, Textarea, tableHeaderClassName, tableHeadTextClassName } from '@hr-portal/ui';
import { Eye, EyeOff } from 'lucide-react';

type StatusFilter = 'all' | InvoiceRecord['status'];
const filters: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Awaiting approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
];

export function FinanceInvoiceRegister({
  hiddenAmounts,
  onToggleAmounts,
}: { hiddenAmounts?: boolean; onToggleAmounts?: () => void } = {}) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [localHideAmounts, setLocalHideAmounts] = useState(false);
  const hideAmounts = hiddenAmounts ?? localHideAmounts;
  const [review, setReview] = useState<InvoiceRecord | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const {
    data,
    isLoading,
    error: loadError,
  } = useInvoices({
    page,
    pageSize: 25,
    ...(status === 'all' ? {} : { status }),
  });
  const decide = useApproveInvoice();
  const visible = (data?.data ?? []).filter((invoice) =>
    `${invoice.invoice_number} ${invoice.employees?.first_name ?? ''} ${invoice.employees?.last_name ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  async function submit(action: 'approved' | 'rejected') {
    if (!review) return;
    if (action === 'rejected' && !notes.trim()) {
      setError('Add a reason before rejecting an invoice');
      return;
    }
    setError('');
    try {
      await decide.mutateAsync({ id: review.id, payload: { action, notes: notes.trim() || null } });
      setReview(null);
      setNotes('');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save invoice decision');
    }
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">Invoice register</h2>
        <p className="text-sm text-muted-foreground">
          Approval does not pay an invoice. Wise completion must be verified separately.
        </p>
      </div>
      {loadError ? (
        <p role="alert" className="text-sm text-red-700">
          Could not load invoices
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSearchInput placeholder="Search invoice or staff…" value={search} onChange={setSearch} />
        <FilterSelect
          label="Status"
          value={status}
          onValueChange={(value) => {
            setStatus(filters.find((filter) => filter.value === value)?.value ?? 'all');
            setPage(1);
            setReview(null);
          }}
          options={filters.filter((filter) => filter.value !== 'all')}
        />
        <Button
          type="button"
          variant="ghost"
          className="ml-auto"
          aria-pressed={hideAmounts}
          onClick={onToggleAmounts ?? (() => setLocalHideAmounts((hidden) => !hidden))}
        >
          {hideAmounts ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          {hideAmounts ? 'Show amounts' : 'Hide amounts'}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[730px] text-left text-sm">
          <thead className={`${tableHeaderClassName} ${tableHeadTextClassName}`}>
            <tr>
              {['Invoice #', 'Staff', 'Period', 'Amount', 'Status', 'Payment', 'Actions'].map((title) => (
                <th key={title} scope="col" className={title === 'Actions' ? 'p-3 text-right' : 'p-3'}>
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((invoice) => (
              <tr key={invoice.id} className="border-b last:border-0 hover:bg-[#fafbf9]">
                <td className="p-3 font-semibold">{invoice.invoice_number}</td>
                <td className="p-3">
                  {invoice.employees
                    ? `${invoice.employees.first_name} ${invoice.employees.last_name}`
                    : 'Staff member'}
                </td>
                <td className="whitespace-nowrap p-3 tabular-nums">
                  {formatFinanceDateRange(invoice.period_start, invoice.period_end)}
                </td>
                <td className="whitespace-nowrap p-3 tabular-nums">
                  {hideAmounts
                    ? '••••'
                    : new Intl.NumberFormat('en-AU', {
                        style: 'currency',
                        currency: invoice.source_currency || 'PHP',
                      }).format(invoice.net_amount)}
                </td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${invoice.status === 'paid' ? 'bg-[#e5f4ea] text-[#0f8a3c]' : invoice.status === 'rejected' ? 'bg-[#fbe7e7] text-[#c43434]' : invoice.status === 'submitted' ? 'bg-[#fdf2dc] text-[#b76e00]' : 'bg-[#e6f0f1] text-[#16505f]'}`}
                  >
                    {invoice.status === 'submitted' ? 'Awaiting approval' : invoice.status}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">
                  {invoice.status === 'paid' ? 'Paid' : '—'}
                </td>
                <td className="p-3 text-right">
                  {invoice.status === 'submitted' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={decide.isPending}
                      onClick={() => {
                        setReview(invoice);
                        setNotes('');
                        setError('');
                      }}
                    >
                      Review
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Loading invoices…</p>
        ) : !loadError && visible.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            No invoices on this page match the filter.
          </p>
        ) : null}
      </div>
      {review ? (
        <div className="rounded-lg border border-[#16505f] bg-[#f1f8f9] p-4">
          <h3 className="font-semibold">Review {review.invoice_number}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            An approved invoice may be added to a Wise batch. It is not Paid until a completed
            transfer is verified.
          </p>
          <label className="mt-3 block text-sm">
            Decision notes
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={5000}
              rows={2}
              className="mt-1"
              placeholder="Required for rejection"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" disabled={decide.isPending} onClick={() => void submit('approved')}>
              Approve invoice
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={decide.isPending}
              onClick={() => void submit('rejected')}
            >
              Reject invoice
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={decide.isPending}
              onClick={() => setReview(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {data ? (
        <PaginationBar
          page={page}
          totalPages={data.pagination.totalPages}
          onPageChange={setPage}
          total={data.pagination.total}
          pageSize={25}
          itemLabel="invoices"
        />
      ) : null}
    </section>
  );
}
