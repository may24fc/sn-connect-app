'use client';

import {
  TICKET_CATEGORY_LABELS,
  TICKET_FEATURE_AREA_LABELS,
  type TicketCategory,
  type TicketFeatureArea,
} from '@/lib/schemas/ticket.schema';
import { Badge, cn } from '@hr-portal/ui';
import type { ReactNode } from 'react';

type TicketStatus =
  | 'new'
  | 'triaged'
  | 'assigned'
  | 'in_progress'
  | 'waiting_on_user'
  | 'resolved'
  | 'closed';

type TicketTeam = 'hr' | 'it';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'New',
  triaged: 'Triaged',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  waiting_on_user: 'Waiting on User',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_CLASSNAMES: Record<TicketPriority, string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
  urgent: 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
};

const STATUS_CLASSNAMES: Record<TicketStatus, string> = {
  new: 'bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400',
  triaged: 'bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400',
  assigned: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  waiting_on_user: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  closed: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

const TEAM_CLASSNAMES: Record<TicketTeam, string> = {
  hr: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-400',
  it: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400',
};

export const TICKET_STATUS_OPTIONS: Array<{ value: TicketStatus; label: string }> = [
  { value: 'new', label: STATUS_LABELS.new },
  { value: 'triaged', label: STATUS_LABELS.triaged },
  { value: 'assigned', label: STATUS_LABELS.assigned },
  { value: 'in_progress', label: STATUS_LABELS.in_progress },
  { value: 'waiting_on_user', label: STATUS_LABELS.waiting_on_user },
  { value: 'resolved', label: STATUS_LABELS.resolved },
  { value: 'closed', label: STATUS_LABELS.closed },
];

export const TICKET_PRIORITY_OPTIONS: Array<{ value: TicketPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const TICKET_TEAM_OPTIONS: Array<{ value: TicketTeam; label: string }> = [
  { value: 'hr', label: 'HR' },
  { value: 'it', label: 'IT' },
];

export function TicketStatusBadge({ status }: { status: TicketStatus }): ReactNode {
  return (
    <Badge variant="secondary" className={cn('border-0', STATUS_CLASSNAMES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }): ReactNode {
  return (
    <Badge variant="secondary" className={cn('border-0 capitalize', PRIORITY_CLASSNAMES[priority])}>
      {priority}
    </Badge>
  );
}

export function TicketTeamBadge({ team }: { team: TicketTeam }): ReactNode {
  return (
    <Badge variant="secondary" className={cn('border-0 uppercase', TEAM_CLASSNAMES[team])}>
      {team}
    </Badge>
  );
}

export function getTicketCategoryLabel(category: TicketCategory): string {
  return TICKET_CATEGORY_LABELS[category];
}

export function getTicketFeatureAreaLabel(featureArea: TicketFeatureArea): string {
  return TICKET_FEATURE_AREA_LABELS[featureArea];
}

export function TicketCategoryBadge({ category }: { category: TicketCategory }): ReactNode {
  return (
    <Badge variant="outline" className="border-zinc-200 text-[11px] font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
      {getTicketCategoryLabel(category)}
    </Badge>
  );
}