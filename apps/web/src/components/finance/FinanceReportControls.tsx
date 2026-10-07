'use client';

import { useCallback, useEffect, useState } from 'react';
type Snapshot = { id: string; status: string; exception_count: number; created_at: string };
type ReportData = {
  report: { anomalies: Array<unknown> };
  snapshots: Array<Snapshot>;
};

export function FinanceReportControls({ month }: { month: string }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/finance/reports?month=${month}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load monthly report');
      setData((await response.json()).data);
      setError('');
    } catch {
      setError('Could not load monthly report');
    }
  }, [month]);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(status: 'draft' | 'final') {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/finance/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, status }),
      });
      const result = await response.json();
      if (response.ok) await load();
      else setError(result.error ?? 'Could not save report');
    } catch {
      setError('Could not save report. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Monthly report pack</h2>
        <span className="rounded-full bg-[#e6f0f1] px-2 py-1 text-xs font-semibold text-[#16505f]">
          {data?.snapshots.some((item) => item.status === 'final') ? 'Final' : 'Draft'}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {new Intl.DateTimeFormat('en-AU', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(`${month}-01T00:00:00Z`))}{' '}
        · Save a dated draft with open exceptions. Finalization checks the live ledger again.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div className="divide-y text-sm">
        <div className="py-2">
          <b>Recorded expenses</b>
          <p className="text-xs text-muted-foreground">Category comparison at left</p>
        </div>
        <div className="py-2">
          <b>Reconciliation</b>
          <p className="text-xs text-muted-foreground">
            {data
              ? `${data.report.anomalies.length} flagged direct payments in this month's report. Finalization also checks pending approvals and unmatched requests.`
              : 'Loading report checks…'}
          </p>
        </div>
        <div className="py-2">
          <b>Saved history</b>
          <p className="text-xs text-muted-foreground">
            {data ? `${data.snapshots.length} dated snapshots` : 'Loading snapshots…'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !data}
          onClick={() => void save('draft')}
          className="rounded-md bg-[#16505f] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          type="button"
          disabled={busy || !data || data.snapshots.some((item) => item.status === 'final')}
          onClick={() => void save('final')}
          className="rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Mark final
        </button>
        <a
          href={`/api/expenses/reports/monthly?month=${month}&format=pdf`}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Download current PDF
        </a>
      </div>
      <div className="text-sm">
        <h3 className="font-semibold">Saved snapshots</h3>
        {!data ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : data.snapshots.length ? (
          <ul className="mt-2 space-y-2">
            {data.snapshots.map((item) => (
              <li key={item.id} className="rounded-lg border p-2">
                {item.status === 'final' ? 'Final' : 'Draft'} ·{' '}
                {new Date(item.created_at).toLocaleString()} · {item.exception_count} exceptions ·{' '}
                <a
                  className="font-medium text-[#16505f] underline"
                  href={`/api/finance/reports?month=${month}&snapshot=${item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View saved snapshot
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No snapshots for this month.</p>
        )}
      </div>
      <p className="rounded-lg bg-[#e6f0f1] p-3 text-xs text-[#0f3f4b]">
        A draft may record open exceptions. Final is only saved when the server confirms month-end
        checks have cleared. The PDF is a live report, not the saved snapshot.
      </p>
    </section>
  );
}
