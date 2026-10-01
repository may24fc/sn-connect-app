'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from '@hr-portal/ui';
import { Mail } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import {
  type FivePercentSummaryEmailTrigger,
  useFivePercentSummaryEmail,
} from './useFivePercentSummaryEmail';

const TRIGGER_LABELS: Record<FivePercentSummaryEmailTrigger, string> = {
  all_submitted: 'automatically, everyone submitted',
  deadline: 'automatically, at the deadline',
  manual: 'manually',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type FivePercentSummaryEmailButtonProps = {
  monthKey: string;
  monthLabel: string;
};

export function FivePercentSummaryEmailButton({
  monthKey,
  monthLabel,
}: FivePercentSummaryEmailButtonProps): ReactNode {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const { status, isLoading, isSending, sendEmail } = useFivePercentSummaryEmail({
    monthKey,
    onError: (title, description) => addToast({ title, description, variant: 'error' }),
    onSent: (recipientCount) =>
      addToast({
        title: 'Summary emailed',
        description: `Sent the ${monthLabel} summary to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}.`,
        variant: 'success',
      }),
  });

  const completion = status?.completion;
  const lastEmail = status?.lastEmail ?? null;
  const hasSubmissions = (completion?.submittedCount ?? 0) > 0;
  const disabledReason = !status
    ? null
    : !status.recipientsConfigured
      ? 'Email recipients are not configured yet.'
      : !hasSubmissions
        ? 'No reflections submitted for this month yet.'
        : null;

  async function handleConfirm(): Promise<void> {
    const sent = await sendEmail();
    if (sent) {
      setOpen(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          disabled={isLoading || isSending || !status || disabledReason !== null}
          title={disabledReason ?? undefined}
        >
          <Mail className="h-4 w-4" />
          {lastEmail ? 'Resend Summary Email' : 'Email Summary'}
        </Button>
        <p className="text-xs text-muted-foreground">
          {lastEmail
            ? `Emailed ${formatDateTime(lastEmail.emailedAt)} (${lastEmail.trigger ? TRIGGER_LABELS[lastEmail.trigger] : 'sent'})`
            : (disabledReason ?? 'Not emailed yet')}
        </p>
      </div>

      <Dialog open={open} onOpenChange={(next) => !isSending && setOpen(next)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {lastEmail ? 'Resend' : 'Email'} the {monthLabel} summary?
            </DialogTitle>
            <DialogDescription>
              The AI summary goes to the {status?.recipientCount ?? 0} configured recipient
              {status?.recipientCount === 1 ? '' : 's'}. It covers the reflections submitted so far.
            </DialogDescription>
          </DialogHeader>

          {completion ? (
            <div className="space-y-3 text-sm">
              <p className="text-foreground">
                <span className="font-semibold">
                  {completion.submittedCount} of {completion.expectedCount}
                </span>{' '}
                expected teammates have submitted.
              </p>
              {completion.pendingNames.length > 0 ? (
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
                  <p className="font-medium text-foreground">
                    Not yet submitted ({completion.pendingNames.length})
                  </p>
                  <p className="mt-1 text-muted-foreground">{completion.pendingNames.join(', ')}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    They will be listed in the email as pending.
                  </p>
                </div>
              ) : null}
              {lastEmail ? (
                <p className="text-muted-foreground">
                  Already emailed {formatDateTime(lastEmail.emailedAt)}. Confirming sends it again.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  The automatic email will not be sent again for this month after you send it.
                </p>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button onClick={() => void handleConfirm()} disabled={isSending}>
              {isSending ? 'Sending...' : lastEmail ? 'Send Again' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
