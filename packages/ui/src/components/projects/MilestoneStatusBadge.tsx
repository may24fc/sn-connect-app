'use client';

import type * as React from 'react';
import { Badge } from '../../primitives/badge';

export type MilestoneStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'overdue';

const LABEL: Record<MilestoneStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Ready to complete',
  approved: 'Completed',
  overdue: 'Overdue',
};

const CLASSES: Record<MilestoneStatus, string> = {
  not_started: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  in_progress: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
  submitted: 'bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

export function MilestoneStatusBadge({
  status,
  className,
}: {
  status: MilestoneStatus;
  className?: string;
}): React.ReactElement {
  return (
    <Badge variant="secondary" className={`${CLASSES[status]} ${className ?? ''}`}>
      {LABEL[status]}
    </Badge>
  );
}
