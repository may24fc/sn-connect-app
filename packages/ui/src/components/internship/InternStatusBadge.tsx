'use client';

import * as React from 'react';
import { CheckCircle2, Clock, XCircle, Pause, FileText, AlertCircle } from 'lucide-react';
import { Badge } from '../../primitives/badge';
import { cn } from '../../utils/cn';
import type { InternshipStatus, ReportStatus } from '../../types/internship.types';
import { INTERNSHIP_STATUS_CONFIG, REPORT_STATUS_CONFIG } from '../../types/internship.types';

interface InternshipStatusBadgeProps {
  status: InternshipStatus;
  className?: string;
  showIcon?: boolean;
}

const INTERNSHIP_ICONS: Record<InternshipStatus, React.ElementType> = {
  active: Clock,
  completed: CheckCircle2,
  terminated: XCircle,
  on_hold: Pause,
};

export function InternshipStatusBadge({
  status,
  className,
  showIcon = true,
}: InternshipStatusBadgeProps): React.ReactNode {
  const config = INTERNSHIP_STATUS_CONFIG[status];
  const Icon = INTERNSHIP_ICONS[status];

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

interface ReportStatusBadgeProps {
  status: ReportStatus;
  className?: string;
  showIcon?: boolean;
}

const REPORT_ICONS: Record<ReportStatus, React.ElementType> = {
  submitted: FileText,
  reviewed: CheckCircle2,
  needs_revision: AlertCircle,
};

export function ReportStatusBadge({
  status,
  className,
  showIcon = true,
}: ReportStatusBadgeProps): React.ReactNode {
  const config = REPORT_STATUS_CONFIG[status];
  const Icon = REPORT_ICONS[status];

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

interface HoursProgressBadgeProps {
  completedHours: number;
  requiredHours: number;
  className?: string;
}

export function HoursProgressBadge({
  completedHours,
  requiredHours,
  className,
}: HoursProgressBadgeProps): React.ReactNode {
  const progress = requiredHours > 0 ? (completedHours / requiredHours) * 100 : 0;

  let variant: 'success' | 'warning' | 'error' = 'error';
  let Icon = AlertCircle;

  if (progress >= 100) {
    variant = 'success';
    Icon = CheckCircle2;
  } else if (progress >= 50) {
    variant = 'warning';
    Icon = Clock;
  }

  return (
    <Badge variant={variant} className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {completedHours} / {requiredHours} hrs
    </Badge>
  );
}
