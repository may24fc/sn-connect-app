'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hr-portal/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Server-confirmed delete with a confirmation dialog. The server re-checks permission and
 * history rules; the caller refreshes its data in `onDeleted` (default: refresh the route).
 */
export function FinanceDeleteButton({
  endpoint,
  title,
  description,
  onDeleted,
  label = 'Delete',
  disabled = false,
}: {
  endpoint: string;
  title: string;
  description: string;
  onDeleted?: () => void | Promise<void>;
  label?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirmDelete() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(endpoint, { method: 'DELETE' });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Could not delete this record');
      setOpen(false);
      if (onDeleted) await onDeleted();
      else router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this record');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="link"
        size="sm"
        type="button"
        className="h-auto p-0 text-rose-700"
        disabled={disabled}
        onClick={() => {
          setError('');
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Dialog open={open} onOpenChange={(next) => (busy ? undefined : setOpen(next))}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void confirmDelete()}
            >
              {busy ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
