'use client';

import * as React from 'react';
import { FileText, CheckCircle2, Eye } from 'lucide-react';
import { Badge } from '../../primitives/badge';
import { cn } from '../../utils/cn';
import type { ReportStatus } from './types';
import { REPORT_STATUS_CONFIG } from './types';

interface ReportStatusBadgeProps {
  status: ReportStatus;
  className?: string;
  showIcon?: boolean;
}

const REPORT_ICONS: Record<ReportStatus, React.ElementType> = {
  draft: FileText,
  submitted: CheckCircle2,
  reviewed: Eye,
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
