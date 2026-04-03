'use client';

import type { TicketRecord } from '@/hooks/useTickets';
import { formatDate } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hr-portal/ui';
import { ClipboardList, Paperclip } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  getTicketFeatureAreaLabel,
  TicketCategoryBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
  TicketTeamBadge,
} from './ticket-badges';

interface TicketListTableProps {
  tickets: Array<TicketRecord>;
  emptyTitle: string;
  emptyDescription: string;
  showSubmittedBy?: boolean;
  showAssignedTo?: boolean;
  actionLabel?: string;
  onAction?: (ticket: TicketRecord) => void;
}

export function TicketListTable({
  tickets,
  emptyTitle,
  emptyDescription,
  showSubmittedBy = false,
  showAssignedTo = false,
  actionLabel,
  onAction,
}: TicketListTableProps): ReactNode {
  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={ClipboardList}
            title={emptyTitle}
            description={emptyDescription}
            size="sm"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              {showSubmittedBy ? <TableHead>Submitted By</TableHead> : null}
              {showAssignedTo ? <TableHead>Assigned To</TableHead> : null}
              <TableHead>Updated</TableHead>
              {onAction ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{ticket.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <TicketCategoryBadge category={ticket.category} />
                      {ticket.feature_area ? (
                        <Badge variant="secondary" className="border-0 bg-zinc-100 text-[11px] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                          {getTicketFeatureAreaLabel(ticket.feature_area)}
                        </Badge>
                      ) : null}
                      {ticket.has_attachments ? (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="h-3.5 w-3.5" />
                          Attachment included
                        </span>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{ticket.description}</p>
                    {ticket.steps_to_reproduce ? (
                      <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                        Steps: {ticket.steps_to_reproduce}
                      </p>
                    ) : null}
                    {ticket.resolution_summary ? (
                      <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                        Resolution: {ticket.resolution_summary}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <TicketTeamBadge team={ticket.team} />
                </TableCell>
                <TableCell>
                  <TicketPriorityBadge priority={ticket.priority} />
                </TableCell>
                <TableCell>
                  <TicketStatusBadge status={ticket.status} />
                </TableCell>
                {showSubmittedBy ? (
                  <TableCell className="text-sm text-muted-foreground">
                    {ticket.submitted_by_name ?? 'Ticket Submitter'}
                  </TableCell>
                ) : null}
                {showAssignedTo ? (
                  <TableCell className="text-sm text-muted-foreground">
                    {ticket.assigned_to_name ?? 'Unassigned'}
                  </TableCell>
                ) : null}
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(ticket.updated_at)}
                </TableCell>
                {onAction ? (
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => onAction(ticket)}>
                      {actionLabel ?? 'Open'}
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}