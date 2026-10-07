'use client';

import { useEffect, useState } from 'react';

type Entry = { id: string; submitted_by: string; vendor_name: string; transaction_date: string; total_amount: number; currency: string; category_code: string | null; source_type: string; match_status: string };

export function FinanceApprovalQueue() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  async function load() {
    const response = await fetch('/api/finance/review', { cache: 'no-store' });
    if (response.ok) setEntries((await response.json()).data);
    else setError('Could not load expense approvals');
  }
  useEffect(() => { void load(); }, []);
  async function decide(expenseId: string, outcome: 'approved' | 'rejected') {
    setBusy(expenseId); setError('');
    const response = await fetch('/api/finance/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expenseId, outcome }) });
    const payload = await response.json();
    setBusy(null);
    if (response.ok) void load(); else setError(payload.error ?? 'Could not save decision');
  }
  return <section className="space-y-3 rounded-xl border bg-card p-5"><h2 className="text-lg font-semibold">Expense approval queue</h2><p className="text-sm text-muted-foreground">Review ordinary expenses after matching. Variances are reviewed in the desk below. A submitter cannot approve their own expense.</p>{error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}<div className="space-y-2">{entries.map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm"><div><p className="font-medium">{entry.vendor_name} · {entry.currency} {Number(entry.total_amount).toFixed(2)}</p><p className="text-muted-foreground">{entry.transaction_date} · {entry.category_code?.replaceAll('_', ' ') || 'Other'} · {entry.source_type === 'staff_request' ? 'Request' : 'Direct payment'} · {entry.match_status}</p></div><div className="flex gap-2"><button disabled={busy !== null} onClick={() => void decide(entry.id, 'rejected')} className="rounded border px-3 py-1 disabled:opacity-50">Reject</button><button disabled={busy !== null} onClick={() => void decide(entry.id, 'approved')} className="rounded bg-teal-700 px-3 py-1 text-white disabled:opacity-50">Approve</button></div></div>)}{entries.length === 0 ? <p className="text-sm text-muted-foreground">No ordinary expenses await approval.</p> : null}</div></section>;
}
