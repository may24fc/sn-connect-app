'use client';

import type { TicketAttachmentRecord, TicketRecord } from '@/hooks/useTickets';
import { formatDate } from '@/lib/format';
import { Badge, Separator } from '@hr-portal/ui';
import { AlertCircle, ExternalLink, Paperclip } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  getTicketFeatureAreaLabel,
  TicketCategoryBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
  TicketTeamBadge,
} from './ticket-badges';

interface TicketDetailsPanelProps {
  ticket: TicketRecord | null;
  attachments?: Array<TicketAttachmentRecord> | undefined;
  attachmentsError?: string | null;
  attachmentsLoading?: boolean;
}

function DetailBlock({ label, value }: { label: string; value: ReactNode }): ReactNode {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

export function TicketDetailsPanel({
  ticket,
  attachments = [],
  attachmentsError,
  attachmentsLoading = false,
}: TicketDetailsPanelProps): ReactNode {
  if (!ticket) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <TicketTeamBadge team={ticket.team} />
          <TicketCategoryBadge category={ticket.category} />
          <TicketPriorityBadge priority={ticket.priority} />
          <TicketStatusBadge status={ticket.status} />
          {ticket.feature_area ? (
            <Badge variant="secondary" className="border-0 bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {getTicketFeatureAreaLabel(ticket.feature_area)}
            </Badge>
          ) : null}
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">{ticket.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailBlock label="Submitted By" value={ticket.submitted_by_name ?? 'Ticket Submitter'} />
        <DetailBlock label="Assigned To" value={ticket.assigned_to_name ?? 'Unassigned'} />
        <DetailBlock label="Submitted" value={formatDate(ticket.created_at)} />
        <DetailBlock label="Last Updated" value={formatDate(ticket.updated_at)} />
      </div>

      {(ticket.steps_to_reproduce || ticket.expected_behavior) ? <Separator /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {ticket.steps_to_reproduce ? (
          <DetailBlock
            label="Steps To Reproduce"
            value={<p className="whitespace-pre-wrap text-sm text-foreground">{ticket.steps_to_reproduce}</p>}
          />
        ) : null}
        {ticket.expected_behavior ? (
          <DetailBlock
            label="Expected Behavior"
            value={<p className="whitespace-pre-wrap text-sm text-foreground">{ticket.expected_behavior}</p>}
          />
        ) : null}
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Attachments</p>
        </div>
        {attachmentsLoading ? (
          <p className="text-sm text-muted-foreground">Loading attachments...</p>
        ) : attachmentsError ? (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span>{attachmentsError}</span>
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachments were included with this ticket.</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">Added {formatDate(attachment.created_at)}</p>
                </div>
                {attachment.signed_url ? (
                  <a
                    href={attachment.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    View attachment
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">Preview unavailable</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}