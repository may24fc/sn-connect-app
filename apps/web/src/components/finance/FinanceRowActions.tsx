'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  RowActionsTrigger,
} from '@hr-portal/ui';
import { type LucideIcon, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type FinanceDeleteAction = {
  /** Menu or button text, e.g. "Delete expense". */
  label: string;
  endpoint: string;
  title: string;
  description: string;
  /** Refreshes the caller's data; defaults to refreshing the route. */
  onDeleted?: () => void | Promise<void>;
};

export type FinanceRowAction = {
  label: string;
  icon: LucideIcon;
} & (
  | { onSelect: () => void; href?: never }
  /** File downloads from API routes. */
  | { href: string; onSelect?: never }
);

/**
 * Server-confirmed delete confirmation. The server re-checks permission and history rules
 * before removing anything.
 */
export function FinanceDeleteDialog({
  open,
  onOpenChange,
  action,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: FinanceDeleteAction;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirmDelete() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(action.endpoint, { method: 'DELETE' });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Could not delete this record');
      onOpenChange(false);
      if (action.onDeleted) await action.onDeleted();
      else router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this record');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (next) setError('');
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>{action.title}</DialogTitle>
          <DialogDescription>{action.description}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
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
  );
}

/**
 * Standard row "more actions" menu (the shared `RowActionsTrigger`), with an optional
 * destructive delete item separated from the other actions.
 */
export function FinanceRowActions({
  label,
  actions = [],
  deleteAction,
  disabled = false,
}: {
  /** Accessible name for the trigger, e.g. "Actions for Uber". */
  label: string;
  actions?: Array<FinanceRowAction>;
  deleteAction?: FinanceDeleteAction | null;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!(actions.length || deleteAction)) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <RowActionsTrigger label={label} disabled={disabled} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map(({ label: itemLabel, icon: Icon, onSelect, href }) =>
            href ? (
              <DropdownMenuItem key={itemLabel} asChild>
                <a href={href}>
                  <Icon className="mr-2 h-4 w-4" />
                  {itemLabel}
                </a>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={itemLabel} onClick={onSelect}>
                <Icon className="mr-2 h-4 w-4" />
                {itemLabel}
              </DropdownMenuItem>
            )
          )}
          {deleteAction ? (
            <>
              {actions.length ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                className="text-rose-600 focus:text-rose-700"
                onClick={() => setConfirming(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteAction.label}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {deleteAction ? (
        <FinanceDeleteDialog open={confirming} onOpenChange={setConfirming} action={deleteAction} />
      ) : null}
    </>
  );
}

/** Outline delete button for card footers that already use outline action buttons. */
export function FinanceDeleteButton({ action }: { action: FinanceDeleteAction }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="text-rose-600 hover:text-rose-700"
        onClick={() => setConfirming(true)}
      >
        <Trash2 aria-hidden />
        {action.label}
      </Button>
      <FinanceDeleteDialog open={confirming} onOpenChange={setConfirming} action={action} />
    </>
  );
}
