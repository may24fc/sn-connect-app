'use client';

import type { TicketAssigneeOption } from '@/hooks/useTicketAssignees';
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
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { TicketCommentsPanel } from './TicketCommentsPanel';
import { TicketDetailsPanel } from './TicketDetailsPanel';
import { TICKET_PRIORITY_OPTIONS, TICKET_STATUS_OPTIONS, TICKET_TEAM_OPTIONS } from './ticket-badges';

type TicketStatus = 'new' | 'triaged' | 'assigned' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketTeam = 'hr' | 'it';

interface TicketAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketRecord | null;
  assignees: Array<TicketAssigneeOption>;
  onSubmit: (payload: {
    team: TicketTeam;
    assignedTo: string | null;
    priority: TicketPriority;
    status: TicketStatus;
    resolutionSummary: string;
  }) => Promise<void>;
  isPending: boolean;
}

export function TicketAssignmentDialog({
  open,
  onOpenChange,
  ticket,
  assignees,
  onSubmit,
  isPending,
}: TicketAssignmentDialogProps): ReactNode {
  const [team, setTeam] = useState<TicketTeam>('hr');
  const [assignedTo, setAssignedTo] = useState('unassigned');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [status, setStatus] = useState<TicketStatus>('triaged');
  const [resolutionSummary, setResolutionSummary] = useState('');

  useEffect(() => {
    if (!ticket) {
      return;
    }

    setTeam(ticket.team);
    setAssignedTo(ticket.assigned_to ?? 'unassigned');
    setPriority(ticket.priority);
    setStatus(ticket.status);
    setResolutionSummary(ticket.resolution_summary ?? '');
  }, [ticket]);

  const filteredAssignees = useMemo(
    () => assignees.filter((assignee) => assignee.team === team),
    [assignees, team]
  );
  const { data: attachmentData, isLoading: attachmentsLoading, error: attachmentsError } =
    useTicketAttachments(ticket?.id, { enabled: open && Boolean(ticket) });

  useEffect(() => {
    if (assignedTo === 'unassigned') {
      return;
    }

    if (!filteredAssignees.some((assignee) => assignee.id === assignedTo)) {
      setAssignedTo('unassigned');
    }
  }, [assignedTo, filteredAssignees]);

  const handleSubmit = async () => {
    await onSubmit({
      team,
      assignedTo: assignedTo === 'unassigned' ? null : assignedTo,
      priority,
      status,
      resolutionSummary,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Triage Ticket</DialogTitle>
          <DialogDescription>
            Review the full ticket context before routing it to the right team and handler.
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
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Team</Label>
            <Select value={team} onValueChange={(value) => setTeam(value as TicketTeam)}>
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {TICKET_TEAM_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as TicketPriority)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {TICKET_PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Assign To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Keep unassigned</SelectItem>
                {filteredAssignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as TicketStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {TICKET_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Resolution Summary</Label>
            <Textarea
              value={resolutionSummary}
              onChange={(event) => setResolutionSummary(event.target.value)}
              placeholder="Add triage notes or a resolution summary..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}