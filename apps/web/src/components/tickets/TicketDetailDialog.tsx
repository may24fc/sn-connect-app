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
  Separator,
} from '@hr-portal/ui';
import type { ReactNode } from 'react';
import { TicketCommentsPanel } from './TicketCommentsPanel';
import { TicketDetailsPanel } from './TicketDetailsPanel';

interface TicketDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketRecord | null;
  title?: string;
  description?: string;
}

export function TicketDetailDialog({
  open,
  onOpenChange,
  ticket,
  title = 'Ticket Details',
  description = 'Review the full submitted context and any attachments for this ticket.',
}: TicketDetailDialogProps): ReactNode {
  const { data: attachmentData, isLoading: attachmentsLoading, error: attachmentsError } =
    useTicketAttachments(ticket?.id, { enabled: open && Boolean(ticket) });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <TicketDetailsPanel
          ticket={ticket}
          attachments={attachmentData?.data}
          attachmentsLoading={attachmentsLoading}
          attachmentsError={attachmentsError?.message ?? null}
        />

        <Separator />

        <TicketCommentsPanel ticket={ticket} enabled={open} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}