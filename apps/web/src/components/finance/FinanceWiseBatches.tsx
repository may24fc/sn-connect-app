'use client';

import { useCallback, useEffect, useState } from 'react';

type ReadyInvoice = {
  id: string;
  invoice_number: string;
  net_amount: number;
  source_currency: string;
  target_currency: string;
  eligible: boolean;
  employee?: { first_name: string; last_name: string } | null;
};
type Batch = {
  id: string;
  status: string;
  created_at: string;
  items: Array<{
    id: string;
    payment_reference: string;
    status: string;
    wise_transfer_id: string | null;
  }>;
  import_rows: Array<{
    id: string;
    payment_reference: string | null;
    result: string;
    detail: string | null;
  }>;
};
type Queue = { ready: Array<ReadyInvoice>; batches: Array<Batch> };
type ImportResult = { reference: string; transferId: string; result: string; detail: string };

export function FinanceWiseBatches() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [selected, setSelected] = useState<Array<string>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<Array<ImportResult>>([]);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/finance/wise-batches', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load Wise payment queue');
      setQueue((await response.json()).data);
      setError('');
    } catch {
      setError('Could not load Wise payment queue');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }
  async function createBatch() {
    setBusy(true);
    setError('');
    const response = await fetch('/api/finance/wise-batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceIds: selected }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error ?? 'Could not create batch');
      return;
    }
    setSelected([]);
    void load();
  }
  async function uploadCsv(batchId: string, file: File, kind: 'export' | 'results') {
    setBusy(true);
    setError('');
    setResults([]);
    const response = await fetch(`/api/finance/wise-batches/${batchId}/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: await file.text(),
    });
    if (kind === 'export' && response.ok) {
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `wise-batch-${batchId}.csv`;
      link.click();
      URL.revokeObjectURL(href);
    } else {
      const payload = await response.json();
      if (response.ok) {
        setResults(payload.data.results);
        void load();
      } else setError(payload.error ?? 'Could not process CSV');
    }
    setBusy(false);
  }
  return (
    <section className="space-y-5 rounded-xl border bg-gradient-to-r from-[#f1f8f9] to-white p-5">
      <div>
        <h2 className="text-xl font-semibold">Next Wise payout</h2>
        <p className="text-sm text-muted-foreground">
          {queue
            ? `${queue.ready.filter((item) => item.eligible).length} approved invoices eligible for a batch`
            : 'Loading approved invoices…'}{' '}
          · Only verified saved recipients without earlier transfers can be batched. Exporting never
          marks an invoice Paid.
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-3">
        {[
          ['1', 'Create a batch', 'Select approved invoices with verified recipients below.'],
          ['2', 'Pay in Wise', 'Fill and upload the saved-recipient CSV in Wise Business.'],
          [
            '3',
            'Verify the results',
            'Import completed Wise results; only confirmed transfers become Paid.',
          ],
        ].map(([number, title, detail]) => (
          <div key={number} className="rounded-xl border bg-white p-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e6f0f1] text-xs font-bold text-[#16505f]">
              {number}
            </span>
            <h3 className="mt-2 text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead>
            <tr>
              {['Select', 'Invoice', 'Staff', 'Amount', 'Currency', 'Eligibility'].map((label) => (
                <th key={label} className="border-b p-2">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {queue?.ready.map((invoice) => (
              <tr key={invoice.id}>
                <td className="border-b p-2">
                  <input
                    type="checkbox"
                    aria-label={`Select ${invoice.invoice_number}`}
                    disabled={!invoice.eligible || busy}
                    checked={selected.includes(invoice.id)}
                    onChange={() => toggle(invoice.id)}
                  />
                </td>
                <td className="border-b p-2">{invoice.invoice_number}</td>
                <td className="border-b p-2">
                  {invoice.employee
                    ? `${invoice.employee.first_name} ${invoice.employee.last_name}`
                    : 'Staff member'}
                </td>
                <td className="border-b p-2">{Number(invoice.net_amount).toFixed(2)}</td>
                <td className="border-b p-2">
                  {invoice.source_currency} → {invoice.target_currency}
                </td>
                <td className="border-b p-2">
                  {invoice.eligible ? 'Ready' : 'Existing transfer or missing verified recipient'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {queue?.ready.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">No approved invoices are waiting.</p>
        ) : null}
      </div>
      <button
        type="button"
        disabled={busy || selected.length === 0}
        onClick={() => void createBatch()}
        className="rounded bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        Create batch for {selected.length} invoices
      </button>
      <div className="space-y-3">
        <h3 className="font-semibold">Created batches</h3>
        {queue?.batches.map((batch) => (
          <div key={batch.id} className="rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-medium">
                {batch.id} · {batch.status}
              </span>
              <span>{new Date(batch.created_at).toLocaleString()}</span>
            </div>
            <p className="my-2 text-muted-foreground">
              {batch.items.length} invoices ·{' '}
              {batch.items.filter((item) => item.status === 'completed').length} verified paid
            </p>
            <div className="flex flex-wrap gap-4">
              <label className="cursor-pointer rounded border px-3 py-2">
                Fill Wise saved-recipient CSV
                <input
                  className="sr-only"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadCsv(batch.id, file, 'export');
                    event.target.value = '';
                  }}
                />
              </label>
              <label className="cursor-pointer rounded border px-3 py-2">
                Import Wise results CSV
                <input
                  className="sr-only"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadCsv(batch.id, file, 'results');
                    event.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      {queue?.batches.some((batch) =>
        batch.import_rows?.some((row) => row.result !== 'completed')
      ) ? (
        <section className="rounded-xl border border-amber-300 p-4">
          <h3 className="font-semibold">Wise import exceptions</h3>
          {queue.batches.map((batch) =>
            batch.import_rows
              ?.filter((row) => row.result !== 'completed')
              .map((row) => (
                <p className="mt-1 text-sm" key={row.id}>
                  {batch.id}: {row.payment_reference || 'Unknown reference'} · {row.result} ·{' '}
                  {row.detail || 'Review required'}
                </p>
              ))
          )}
        </section>
      ) : null}
      {results.length ? (
        <div>
          <h3 className="font-semibold">Verification results</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {results.map((item, index) => (
              <li key={`${item.reference}-${index}`}>
                {item.reference || 'Unknown reference'} · {item.result} · {item.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
