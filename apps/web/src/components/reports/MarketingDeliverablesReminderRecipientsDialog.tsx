'use client';

import {
  useMarketingDeliverablesReminderRecipients,
  useUpdateMarketingDeliverablesReminderRecipient,
} from '@/hooks/useMarketingDeliverablesReminderRecipients';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, BellRing, Loader2, Users } from 'lucide-react';
import { useState } from 'react';

interface MarketingDeliverablesReminderRecipientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarketingDeliverablesReminderRecipientsDialog({
  open,
  onOpenChange,
}: MarketingDeliverablesReminderRecipientsDialogProps) {
  const { addToast } = useToast();
  const recipientsQuery = useMarketingDeliverablesReminderRecipients(open);
  const updateRecipient = useUpdateMarketingDeliverablesReminderRecipient();
  const recipients = recipientsQuery.data?.data ?? [];
  const selectedCount = recipients.filter((recipient) => recipient.included).length;

  async function handleIncludedChange(employeeId: string, fullName: string, included: boolean) {
    try {
      await updateRecipient.mutateAsync({ employeeId, included });
      addToast({
        variant: 'success',
        title: included ? 'Recipient included' : 'Recipient excluded',
        description: `${fullName} ${included ? 'will appear in' : 'will be omitted from'} the next reminder.`,
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to update reminder recipient',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Marketing reminder recipients</DialogTitle>
          <DialogDescription>
            Choose the active Marketing employee and associate accounts named in the weekly
            deliverables reminder.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(85vh-9rem)] space-y-4 overflow-y-auto pr-1">
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              Selected recipients
            </span>
            <span className="font-medium text-foreground">
              {selectedCount} of {recipients.length}
            </span>
          </div>

          {recipientsQuery.isLoading ? (
            <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading Marketing employees...
            </div>
          ) : recipientsQuery.isError ? (
            <div className="flex min-h-32 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 px-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="ml-2">
                {recipientsQuery.error instanceof Error
                  ? recipientsQuery.error.message
                  : 'Failed to load reminder recipients.'}
              </span>
            </div>
          ) : recipients.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No active Marketing employee or associate accounts are available.
            </p>
          ) : (
            <div className="space-y-1 rounded-md border border-border p-2">
              {recipients.map((recipient) => {
                const isUpdating =
                  updateRecipient.isPending &&
                  updateRecipient.variables?.employeeId === recipient.employeeId;

                return (
                  <label
                    key={recipient.employeeId}
                    htmlFor={`marketing-reminder-recipient-${recipient.employeeId}`}
                    className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 hover:bg-muted"
                  >
                    <Checkbox
                      id={`marketing-reminder-recipient-${recipient.employeeId}`}
                      checked={recipient.included}
                      disabled={isUpdating}
                      onCheckedChange={(checked) =>
                        void handleIncludedChange(
                          recipient.employeeId,
                          recipient.fullName,
                          checked === true
                        )
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {recipient.fullName}
                      </span>
                      {recipient.position ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {recipient.position}
                        </span>
                      ) : null}
                    </span>
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : null}
                  </label>
                );
              })}
            </div>
          )}

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0" />
            Changes apply to the next scheduled n8n reminder.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MarketingDeliverablesReminderRecipientsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Users className="mr-1.5 h-4 w-4" />
        Reminder recipients
      </Button>
      <MarketingDeliverablesReminderRecipientsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
