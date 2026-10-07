'use client';

import { type InvoiceRecord, useApproveInvoice, useInvoices } from '@/hooks/useInvoices';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type StatusFilter = 'all' | InvoiceRecord['status'];
const filters: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Awaiting approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
];

export function FinanceInvoiceRegister() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
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
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          Search this page{' '}
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Invoice or staff…"
            className="ml-2 rounded-lg border px-3 py-2"
          />
        </label>
        <nav aria-label="Invoice status" className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={status === filter.value}
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
                setReview(null);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${status === filter.value ? 'border-[#16505f] bg-[#16505f] text-white' : 'bg-white text-[#4a5558]'}`}
            >
              {filter.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[730px] text-left text-sm">
          <thead className="border-b bg-[#fafbf9] text-xs uppercase tracking-wide text-[#838c8e]">
            <tr>
              {['Invoice #', 'Staff', 'Period', 'Amount', 'Status', 'Payment', ''].map((title) => (
                <th key={title} scope="col" className="p-3 font-semibold">
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
                  {invoice.period_start} – {invoice.period_end}
                </td>
                <td className="whitespace-nowrap p-3 tabular-nums">
                  {new Intl.NumberFormat('en-AU', {
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
                <td className="p-3">
                  {invoice.status === 'submitted' ? (
                    <button
                      type="button"
                      disabled={decide.isPending}
                      onClick={() => {
                        setReview(invoice);
                        setNotes('');
                        setError('');
                      }}
                      className="rounded-md border px-3 py-1.5 font-medium text-[#16505f] disabled:opacity-50"
                    >
                      Review
                    </button>
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
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={5000}
              rows={2}
              className="mt-1 block w-full rounded-lg border bg-white p-2"
              placeholder="Required for rejection"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={decide.isPending}
              onClick={() => void submit('approved')}
              className="rounded-md bg-[#16505f] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Approve invoice
            </button>
            <button
              type="button"
              disabled={decide.isPending}
              onClick={() => void submit('rejected')}
              className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
            >
              Reject invoice
            </button>
            <button
              type="button"
              disabled={decide.isPending}
              onClick={() => setReview(null)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {data ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {data.pagination.total} invoices · page {page} of {data.pagination.totalPages || 1}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded border px-3 py-1.5 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded border px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
