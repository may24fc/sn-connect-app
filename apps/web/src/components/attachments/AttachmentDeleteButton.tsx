'use client';

import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { Button, cn } from '@hr-portal/ui';
import { Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';

/**
 * The one delete control for uploaded images, files, and attachments, always behind the
 * same confirmation dialog.
 *
 * - `overlay`: small round red button pinned to the corner of an image thumbnail or preview.
 *   The parent must be `relative`.
 * - `inline`: red ghost icon button for list rows and action groups.
 *
 * `onConfirm` may return a promise. Server-confirmed deletes keep the dialog open with a
 * pending state until it settles; optimistic deletes return immediately and the dialog closes.
 * Callers report their own errors (toasts), so a rejected promise only ends the pending state.
 */
export function AttachmentDeleteButton({
  itemName,
  itemKind = 'attachment',
  variant = 'inline',
  description,
  disabled = false,
  className,
  onConfirm,
}: {
  /** Shown in the dialog and the accessible label, e.g. the file name. */
  itemName: string;
  /** Lowercase noun for the title and button, e.g. "screenshot", "image", "file". */
  itemKind?: string;
  variant?: 'overlay' | 'inline';
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
  onConfirm: () => unknown;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirm() {
    const result = onConfirm();
    if (result instanceof Promise) {
      setPending(true);
      try {
        await result;
      } catch {
        // The caller has already shown the error.
      } finally {
        setPending(false);
      }
    }
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant={variant === 'overlay' ? 'destructive' : 'ghost'}
        size="icon-sm"
        aria-label={`Delete ${itemKind} ${itemName}`}
        title={`Delete ${itemKind}`}
        disabled={disabled}
        className={cn(
          variant === 'overlay'
            ? 'absolute -right-2 -top-2 z-10 h-6 w-6 rounded-full'
            : 'text-destructive hover:bg-destructive/10 hover:text-destructive',
          className
        )}
        onClick={(event) => {
          // Thumbnails and rows are often clickable themselves.
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Trash2 className={variant === 'overlay' ? 'h-3 w-3' : 'h-4 w-4'} />
      </Button>
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${itemKind}?`}
        description={
          description ?? <>&ldquo;{itemName}&rdquo; will be deleted. This can&apos;t be undone.</>
        }
        confirmLabel={`Delete ${itemKind}`}
        isPending={pending}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
