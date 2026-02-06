'use client';

import * as React from 'react';
import { Clock, ArrowRight, Check, X } from 'lucide-react';
import { Badge } from '../../primitives/badge';
import { cn } from '../../utils/cn';
import type { TaskStatus } from '../../types/task.types';
import { TASK_STATUS_CONFIG } from '../../types/task.types';

export interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'default';
  showIcon?: boolean;
  className?: string;
}

const STATUS_ICONS: Record<TaskStatus, React.ElementType> = {
  pending: Clock,
  in_progress: ArrowRight,
  completed: Check,
  blocked: X,
};

export function TaskStatusBadge({
  status,
  size = 'default',
  showIcon = true,
  className,
}: TaskStatusBadgeProps): React.ReactNode {
  const config = TASK_STATUS_CONFIG[status];
  const Icon = STATUS_ICONS[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'gap-1',
        size === 'sm' && 'text-xs py-0 px-2',
        className
      )}
    >
      {showIcon && <Icon className={cn('h-3 w-3', size === 'sm' && 'h-2.5 w-2.5')} />}
      {config.label}
    </Badge>
  );
}
