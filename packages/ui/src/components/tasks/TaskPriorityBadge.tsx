'use client';

import * as React from 'react';
import { Circle, AlertCircle } from 'lucide-react';
import { Badge } from '../../primitives/badge';
import { cn } from '../../utils/cn';
import type { TaskPriority } from '../../types/task.types';
import { TASK_PRIORITY_CONFIG } from '../../types/task.types';

export interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  size?: 'sm' | 'default';
  showIcon?: boolean;
  className?: string;
}

const PRIORITY_ICONS: Record<TaskPriority, React.ElementType> = {
  low: Circle,
  medium: Circle,
  high: Circle,
  urgent: AlertCircle,
};

export function TaskPriorityBadge({
  priority,
  size = 'default',
  showIcon = true,
  className,
}: TaskPriorityBadgeProps): React.ReactNode {
  const config = TASK_PRIORITY_CONFIG[priority];
  const Icon = PRIORITY_ICONS[priority];

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
