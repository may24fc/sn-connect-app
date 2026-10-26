'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@hr-portal/ui';

type ReviewEntry = {
  id: string;
  vendor_name: string;
  transaction_date: string;
  total_amount: number;
  currency: string;
  submitted_by?: string;
  can_decide?: boolean;
};

type ReviewItem = ReviewEntry & { kind: 'difference' | 'approval' | 'unmatched' };

export function FinanceUnifiedReviewQueue() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [differences, approvals, unmatched] = await Promise.all([
        fetch('/api/expenses?matchStatus=variance_flagged&pageSize=200', { cache: 'no-store' }),
        fetch('/api/finance/review', { cache: 'no-store' }),
        fetch('/api/expenses?matchStatus=unmatched&sourceType=staff_request&pageSize=200', { cache: 'no-store' }),
      ]);
      if (![differences, approvals, unmatched].every((response) => response.ok))
        throw new Error('Could not load the complete review queue');
      const [differenceBody, approvalBody, unmatchedBody] = await Promise.all([
        differences.json(), approvals.json(), unmatched.json(),
      ]);
      setItems([
        ...(differenceBody.data ?? []).map((entry: ReviewEntry) => ({ ...entry, kind: 'difference' as const })),
        ...(approvalBody.data ?? []).map((entry: ReviewEntry) => ({ ...entry, kind: 'approval' as const })),
        ...(unmatchedBody.data ?? []).map((entry: ReviewEntry) => ({ ...entry, kind: 'unmatched' as const })),
      ]);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the review queue');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function decide(id: string, outcome: 'approved' | 'rejected') {
    setBusy(id); setError('');
    const response = await fetch('/api/finance/review', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenseId: id, outcome }),
    });
    setBusy(null);
    if (response.ok) void load();
    else setError((await response.json().catch(() => null))?.error ?? 'Could not save decision');
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-5">
      <div><h2 className="text-lg font-semibold">Prioritized review list</h2><p className="text-sm text-muted-foreground">Amount differences first, then approvals, then unmatched requests. Settled records remain in All expenses.</p></div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <div className="divide-y rounded-lg border">
        {items.map((item) => (
          <article key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
            <div>
              <p className="font-medium">{item.vendor_name} · {item.currency} {Number(item.total_amount).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{item.transaction_date} · {item.kind === 'difference' ? 'Amount differs' : item.kind === 'approval' ? 'Approval needed' : 'Unmatched request'}</p>
              {item.kind === 'approval' && item.can_decide === false ? <p className="text-xs font-medium text-amber-700">Submitted by you · another approver must decide</p> : null}
            </div>
            {item.kind === 'approval' ? (
              <div className="flex gap-2"><Button variant="outline" size="sm" type="button" disabled={busy !== null || item.can_decide === false} onClick={() => void decide(item.id, 'rejected')}>Reject</Button><Button size="sm" type="button" disabled={busy !== null || item.can_decide === false} onClick={() => void decide(item.id, 'approved')}>Approve</Button></div>
            ) : (
              <Link className="rounded border px-3 py-1 font-medium text-primary" href={item.kind === 'difference' ? '/admin/expenses' : '/expenses/verify'}>{item.kind === 'difference' ? 'Review difference' : 'Match request'}</Link>
            )}
          </article>
        ))}
        {items.length === 0 && !error ? <p className="p-4 text-sm text-muted-foreground">Nothing needs review.</p> : null}
      </div>
    </section>
  );
}
