'use client';

import { CheckCircle2, Clock, FileText, TrendingUp } from 'lucide-react';
import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { cn } from '../../utils/cn';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: SummaryCardProps): React.ReactNode {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <TrendingUp
              className={cn(
                'h-3 w-3',
                trend.value > 0 && 'text-green-600',
                trend.value < 0 && 'text-red-600 rotate-180'
              )}
            />
            <span
              className={cn(trend.value > 0 && 'text-green-600', trend.value < 0 && 'text-red-600')}
            >
              {trend.value > 0 ? '+' : ''}
              {trend.value}%
            </span>
            <span>{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ReportSummaryCardsProps {
  totalReports: number;
  submittedThisMonth: number;
  pendingDrafts: number;
  className?: string;
}

export function ReportSummaryCards({
  totalReports,
  submittedThisMonth,
  pendingDrafts,
  className,
}: ReportSummaryCardsProps): React.ReactNode {
  return (
    <div className={cn('grid gap-4 md:grid-cols-3', className)}>
      <SummaryCard
        title="Total Reports"
        value={totalReports}
        icon={FileText}
        description="All time submissions"
      />
      <SummaryCard
        title="Submitted This Month"
        value={submittedThisMonth}
        icon={CheckCircle2}
        description="Successfully submitted"
      />
      <SummaryCard
        title="Pending Drafts"
        value={pendingDrafts}
        icon={Clock}
        description="Not yet submitted"
      />
    </div>
  );
}
