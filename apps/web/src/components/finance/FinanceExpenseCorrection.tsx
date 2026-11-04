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
import { formatFinanceDate } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

const aud = (value: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

export function FinanceExpenseCorrection({
  id,
  categoryCode,
  paymentSource,
  paymentStatus,
  currency = 'AUD',
  totalAmount = 0,
  totalAmountAud = null,
  audBasis = null,
  rateDate = null,
}: {
  id: string;
  categoryCode: string | null;
  paymentSource: string | null;
  paymentStatus: string | null;
  currency?: string;
  totalAmount?: number;
  totalAmountAud?: number | null;
  audBasis?: string | null;
  rateDate?: string | null;
}) {
  const router = useRouter();
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(categoryCode ?? 'other');
  const [source, setSource] = useState(paymentSource ?? 'unknown');
  const [status, setStatus] = useState(paymentStatus ?? 'unknown');
  const isForeign = currency.toUpperCase() !== 'AUD';
  const [actualAud, setActualAud] = useState(
    audBasis === 'actual' && totalAmountAud !== null ? String(totalAmountAud) : ''
  );
  const [revertToEstimate, setRevertToEstimate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState('');

  function openEditor() {
    setCategory(categoryCode ?? 'other');
    setSource(paymentSource ?? 'unknown');
    setStatus(paymentStatus ?? 'unknown');
    setActualAud(audBasis === 'actual' && totalAmountAud !== null ? String(totalAmountAud) : '');
    setRevertToEstimate(false);
    setReceipt(null);
    setError('');
    setOpen(true);
  }

  function actualAudPayload(): { actualAud?: number | null } | null {
    if (!isForeign) return {};
    if (revertToEstimate) return { actualAud: null };
    const trimmed = actualAud.trim();
    if (!trimmed) return audBasis === 'actual' ? { actualAud: null } : {};
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value <= 0) return null;
    return { actualAud: Math.round(value * 100) / 100 };
  }

  async function save() {
    const actualField = actualAudPayload();
    if (actualField === null) {
      setError('Enter the actual AUD as an amount greater than zero, or leave it blank.');
      return;
    }
    setBusy(true);
    setError('');
    const response = await fetch(`/api/finance/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryCode: category,
        paymentSource: source,
        paymentStatus: status,
        ...actualField,
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
      <Button variant="link" size="sm" className="mt-1" type="button" onClick={openEditor}>
        Edit details
      </Button>
      <Dialog open={open} onOpenChange={(next) => (busy ? undefined : setOpen(next))}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Edit expense details</DialogTitle>
            <DialogDescription>
              Vendor and date stay as recorded. Changes are audited.
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
            {isForeign ? (
              <div className="grid gap-1.5 rounded-lg border bg-muted/30 p-3">
                <Label htmlFor={`${fieldId}-actual-aud`}>Actual AUD from card or bank statement</Label>
                <p className="text-xs text-muted-foreground">
                  {totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })} {currency.toUpperCase()} ·{' '}
                  {audBasis === 'actual' && totalAmountAud !== null
                    ? `Actual ${aud(totalAmountAud)} recorded`
                    : totalAmountAud !== null
                      ? `Estimated ${aud(totalAmountAud)} at the daily rate${rateDate ? ` for ${formatFinanceDate(rateDate)}` : ''}`
                      : 'No daily rate available yet'}
                </p>
                <input
                  id={`${fieldId}-actual-aud`}
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={revertToEstimate ? '' : actualAud}
                  disabled={revertToEstimate}
                  onChange={(event) => setActualAud(event.target.value)}
                  placeholder={totalAmountAud !== null ? totalAmountAud.toFixed(2) : '0.00'}
                  className="rounded-md border bg-card px-3 py-2 text-sm"
                />
                {audBasis === 'actual' ? (
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={revertToEstimate}
                      onChange={(event) => setRevertToEstimate(event.target.checked)}
                    />
                    Remove the actual amount and use the daily estimate
                  </label>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Replaces the estimate once the charge is on the statement. Leave blank to keep the estimate.
                  </p>
                )}
              </div>
            ) : null}
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
