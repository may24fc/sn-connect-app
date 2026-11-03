'use client';

import { FINANCE_CATEGORIES } from '@/lib/finance/categories';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

export function FinanceExpenseCorrection({
  id,
  categoryCode,
  paymentSource,
  paymentStatus,
}: {
  id: string;
  categoryCode: string | null;
  paymentSource: string | null;
  paymentStatus: string | null;
}) {
  const router = useRouter();
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(categoryCode ?? 'other');
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
      body: JSON.stringify({
        categoryCode: category,
        paymentSource: source,
        paymentStatus: status,
      }),
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
    setBusy(true);
    setError('');
    const form = new FormData();
    form.append('file', receipt);
    const response = await fetch(`/api/finance/expenses/${id}`, { method: 'PUT', body: form });
    setBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? 'Could not attach receipt');
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="link" size="sm" className="mt-1" type="button" onClick={() => setOpen(true)}>
        Edit details
      </Button>
      <Dialog open={open} onOpenChange={(next) => (busy ? undefined : setOpen(next))}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Edit expense details</DialogTitle>
            <DialogDescription>
              Amount, vendor and date stay as recorded. Changes are audited.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor={`${fieldId}-category`}>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id={`${fieldId}-category`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCE_CATEGORIES.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${fieldId}-source`}>Paid with</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id={`${fieldId}-source`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="personal_card">Personal card</SelectItem>
                  <SelectItem value="company_card">Company card</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${fieldId}-status`}>Payment</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id={`${fieldId}-status`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="confirmed">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${fieldId}-receipt`}>Attach or replace receipt</Label>
              <input
                id={`${fieldId}-receipt`}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="text-sm"
                onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" type="button" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {receipt ? (
              <Button
                variant="outline"
                type="button"
                disabled={busy}
                onClick={() => void attachReceipt()}
              >
                Attach receipt
              </Button>
            ) : null}
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save details'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
