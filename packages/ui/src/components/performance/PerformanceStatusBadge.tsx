'use client';

import * as React from 'react';
import { CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';
import { Badge } from '../../primitives/badge';
import { cn } from '../../utils/cn';
import type { ReviewStatus, OKRStatus } from '../../types/performance.types';
import { REVIEW_STATUS_CONFIG, OKR_STATUS_CONFIG } from '../../types/performance.types';

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
  className?: string;
  showIcon?: boolean;
}

const REVIEW_ICONS: Record<ReviewStatus, React.ElementType> = {
  pending_self: FileText,
  pending_manager: Clock,
  pending_hr: Clock,
  completed: CheckCircle2,
};

export function ReviewStatusBadge({
  status,
  className,
  showIcon = true,
}: ReviewStatusBadgeProps): React.ReactNode {
  const config = REVIEW_STATUS_CONFIG[status];
  const Icon = REVIEW_ICONS[status];

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

interface OKRStatusBadgeProps {
  status: OKRStatus;
  className?: string;
}

export function OKRStatusBadge({
  status,
  className,
}: OKRStatusBadgeProps): React.ReactNode {
  const config = OKR_STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

interface ProgressStatusBadgeProps {
  progress: number;
  className?: string;
}

export function ProgressStatusBadge({
  progress,
  className,
}: ProgressStatusBadgeProps): React.ReactNode {
  let variant: 'success' | 'warning' | 'error' = 'error';
  let label = 'Behind';

  if (progress >= 80) {
    variant = 'success';
    label = 'On Track';
  } else if (progress >= 50) {
    variant = 'warning';
    label = 'In Progress';
  }

  return (
    <Badge variant={variant} className={cn('gap-1', className)}>
      {progress >= 80 ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : progress >= 50 ? (
        <Clock className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {label}
    </Badge>
  );
}
