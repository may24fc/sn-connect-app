'use client';

import { Ban, CheckCircle2, Circle, Clock, FileText, Send } from 'lucide-react';
import type * as React from 'react';
import { Badge } from '../../primitives/badge';
import { cn } from '../../utils/cn';

export type InvoiceStatus = 'draft' | 'submitted' | 'approved' | 'sent' | 'paid' | 'rejected';

interface InvoiceStatusConfig {
  label: string;
  variant: 'secondary' | 'pending' | 'approved' | 'default' | 'error' | 'success';
  icon: React.ElementType;
}

const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, InvoiceStatusConfig> = {
  draft: { label: 'Draft', variant: 'secondary', icon: FileText },
  submitted: { label: 'Submitted', variant: 'pending', icon: Clock },
  approved: { label: 'Approved', variant: 'approved', icon: CheckCircle2 },
  sent: { label: 'Sent', variant: 'default', icon: Send },
  paid: { label: 'Paid', variant: 'success', icon: CheckCircle2 },
  rejected: { label: 'Rejected', variant: 'error', icon: Ban },
};

export interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  size?: 'sm' | 'default';
  showIcon?: boolean;
  className?: string;
}

export function InvoiceStatusBadge({
  status,
  size = 'default',
  showIcon = true,
  className,
}: InvoiceStatusBadgeProps): React.ReactNode {
  const config = INVOICE_STATUS_CONFIG[status] ?? INVOICE_STATUS_CONFIG.draft;
  const Icon = config.icon ?? Circle;

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
