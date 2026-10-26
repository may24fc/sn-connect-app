'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hr-portal/ui';

export function FinanceExpenseCorrection({
  id,
  paymentSource,
  paymentStatus,
}: {
  id: string;
  paymentSource: string | null;
  paymentStatus: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(paymentSource ?? 'unknown');
  const [status, setStatus] = useState(paymentStatus ?? 'unknown');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    const response = await fetch(`/api/finance/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentSource: source, paymentStatus: status }),
    });
    setBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? 'Could not save expense details');
      return;
    }
    setOpen(false);
    router.refresh();
  }
  async function attachReceipt() {
    if (!receipt) return;
    setBusy(true); setError('');
    const form = new FormData(); form.append('file', receipt);
    const response = await fetch(`/api/finance/expenses/${id}`, { method: 'PUT', body: form });
    setBusy(false);
    if (!response.ok) { const body = await response.json().catch(() => null); setError(body?.error ?? 'Could not attach receipt'); return; }
    setOpen(false); router.refresh();
  }

  if (!open)
    return <Button variant="link" size="sm" className="mt-1" type="button" onClick={() => setOpen(true)}>Edit details</Button>;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-label="Edit expense details" className="w-full max-w-md space-y-4 rounded-xl border bg-card p-5 shadow-xl">
        <h2 className="text-lg font-semibold">Edit payment details</h2>
        <label className="grid gap-1 text-sm">Paid with
          <Select value={source} onValueChange={(value) => setSource(value)}>
            <SelectTrigger className="w-auto min-w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unknown">Unknown</SelectItem><SelectItem value="personal_card">Personal card</SelectItem><SelectItem value="company_card">Company card</SelectItem><SelectItem value="bank_transfer">Bank transfer</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-sm">Payment
          <Select value={status} onValueChange={(value) => setStatus(value)}>
            <SelectTrigger className="w-auto min-w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unknown">Unknown</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-sm">Attach or replace receipt
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} />
        </label>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>{receipt ? <Button variant="outline" type="button" disabled={busy} onClick={() => void attachReceipt()}>Attach receipt</Button> : null}<Button type="button" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save details'}</Button></div>
      </section>
    </div>
  );
}
