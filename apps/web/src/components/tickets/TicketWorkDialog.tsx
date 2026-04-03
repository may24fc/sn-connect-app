'use client';

import { useTicketAttachments, type TicketRecord } from '@/hooks/useTickets';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Separator,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@hr-portal/ui';
import { type ReactNode, useEffect, useState } from 'react';
import { TicketCommentsPanel } from './TicketCommentsPanel';
import { TicketDetailsPanel } from './TicketDetailsPanel';
import { TICKET_STATUS_OPTIONS } from './ticket-badges';

type HandlerTicketStatus = 'assigned' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';

interface TicketWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketRecord | null;
  onSubmit: (payload: { status: HandlerTicketStatus; resolutionSummary: string }) => Promise<void>;
  isPending: boolean;
}

const HANDLER_STATUS_OPTIONS = TICKET_STATUS_OPTIONS.filter((option) =>
  ['assigned', 'in_progress', 'waiting_on_user', 'resolved', 'closed'].includes(option.value)
);

export function TicketWorkDialog({
  open,
  onOpenChange,
  ticket,
  onSubmit,
  isPending,
}: TicketWorkDialogProps): ReactNode {
  const [status, setStatus] = useState<HandlerTicketStatus>('assigned');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const { data: attachmentData, isLoading: attachmentsLoading, error: attachmentsError } =
    useTicketAttachments(ticket?.id, { enabled: open && Boolean(ticket) });

  useEffect(() => {
    if (!ticket) {
      return;
    }

    const nextStatus = ['assigned', 'in_progress', 'waiting_on_user', 'resolved', 'closed'].includes(ticket.status)
      ? (ticket.status as HandlerTicketStatus)
      : 'assigned';

    setStatus(nextStatus);
    setResolutionSummary(ticket.resolution_summary ?? '');
  }, [ticket]);

  const handleSubmit = async () => {
    if (!ticket) {
      return;
    }

    await onSubmit({ status, resolutionSummary });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Update Ticket</DialogTitle>
          <DialogDescription>
            Review the submitted details and attachments before updating the ticket status.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <TicketDetailsPanel
            ticket={ticket}
            attachments={attachmentData?.data}
            attachmentsLoading={attachmentsLoading}
            attachmentsError={attachmentsError?.message ?? null}
          />
          <Separator />
          <TicketCommentsPanel ticket={ticket} enabled={open} />
          <Separator />
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as HandlerTicketStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {HANDLER_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Resolution Summary</Label>
            <Textarea
              value={resolutionSummary}
              onChange={(event) => setResolutionSummary(event.target.value)}
              placeholder="Add a brief update or resolution note..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}