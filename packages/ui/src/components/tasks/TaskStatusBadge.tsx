'use client';

import { AlertTriangle, ArrowRight, Ban, Check, Circle, Clock, X } from 'lucide-react';
import type * as React from 'react';
import { Badge } from '../../primitives/badge';
import type { TaskStatus } from '../../types/task.types';
import { TASK_STATUS_CONFIG, isTaskOverdue } from '../../types/task.types';
import { cn } from '../../utils/cn';

export interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'default';
  showIcon?: boolean;
  className?: string;
  /** Due date for overdue detection (ISO 8601 string) */
  dueDate?: string | undefined;
}

const STATUS_ICONS: Record<TaskStatus | 'overdue', React.ElementType> = {
  pending: Clock,
  in_progress: ArrowRight,
  completed: Check,
  cancelled: Ban,
  blocked: X,
  overdue: AlertTriangle,
};

const FALLBACK_CONFIG = { label: 'Unknown', variant: 'secondary' as const, icon: 'Circle' };

export function TaskStatusBadge({
  status,
  size = 'default',
  showIcon = true,
  className,
  dueDate,
}: TaskStatusBadgeProps): React.ReactNode {
  const overdue = dueDate ? isTaskOverdue(dueDate, status) : false;

  const config = overdue
    ? { label: 'Overdue', variant: 'error' as const, icon: 'AlertTriangle' }
    : (TASK_STATUS_CONFIG[status] ?? FALLBACK_CONFIG);
  const Icon = overdue ? STATUS_ICONS.overdue : (STATUS_ICONS[status] ?? Circle);

  return (
    <Badge
      variant={config.variant}
      className={cn('gap-1', size === 'sm' && 'text-xs py-0 px-2', className)}
    >
      {showIcon && <Icon className={cn('h-3 w-3', size === 'sm' && 'h-2.5 w-2.5')} />}
      {config.label}
    </Badge>
  );
}
