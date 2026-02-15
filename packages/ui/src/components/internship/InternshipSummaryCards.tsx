'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  TrendingUp,
} from 'lucide-react';
import type * as React from 'react';
import { Card, CardContent } from '../../primitives/card';
import type { InternDashboardStats } from '../../types/internship.types';
import { cn } from '../../utils/cn';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor,
  iconColor,
  trend,
  className,
}: StatCardProps): React.ReactNode {
  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', iconBgColor)}>
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-medium flex items-center gap-0.5',
                    trend.isPositive ? 'text-success' : 'text-error'
                  )}
                >
                  {trend.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {trend.value}%
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface InternshipSummaryCardsProps {
  stats: InternDashboardStats;
  className?: string;
}

export function InternshipSummaryCards({
  stats,
  className,
}: InternshipSummaryCardsProps): React.ReactNode {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <StatCard
        title="Active Interns"
        value={stats.activeInterns}
        subtitle={`${stats.completedInterns} completed`}
        icon={GraduationCap}
        iconBgColor="bg-primary/10"
        iconColor="text-primary"
      />
      <StatCard
        title="Average Progress"
        value={`${stats.averageProgress}%`}
        subtitle={`${stats.totalHoursLogged.toLocaleString()} total hours logged`}
        icon={TrendingUp}
        iconBgColor="bg-success/10"
        iconColor="text-success"
      />
      <StatCard
        title="Reports This Week"
        value={stats.reportsThisWeek}
        subtitle={`${stats.pendingReports} pending review`}
        icon={FileText}
        iconBgColor="bg-warning/10"
        iconColor="text-warning"
      />
      <StatCard
        title="Total Interns"
        value={stats.totalInterns}
        icon={CheckCircle2}
        iconBgColor="bg-secondary/20"
        iconColor="text-secondary-foreground"
      />
    </div>
  );
}

interface InternPersonalStatsProps {
  completedHours: number;
  requiredHours: number;
  reportsSubmitted: number;
  daysRemaining: number;
  className?: string;
}

export function InternPersonalStats({
  completedHours,
  requiredHours,
  reportsSubmitted,
  daysRemaining,
  className,
}: InternPersonalStatsProps): React.ReactNode {
  const progress = requiredHours > 0 ? Math.round((completedHours / requiredHours) * 100) : 0;
  const remainingHours = Math.max(0, requiredHours - completedHours);

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <StatCard
        title="Hours Completed"
        value={completedHours}
        subtitle={`${progress}% of ${requiredHours} hrs`}
        icon={Clock}
        iconBgColor="bg-primary/10"
        iconColor="text-primary"
      />
      <StatCard
        title="Hours Remaining"
        value={remainingHours}
        subtitle={
          daysRemaining > 0
            ? `~${Math.ceil((remainingHours / daysRemaining) * 5)} hrs/week needed`
            : 'Complete!'
        }
        icon={Clock}
        iconBgColor="bg-warning/10"
        iconColor="text-warning"
      />
      <StatCard
        title="Reports Submitted"
        value={reportsSubmitted}
        icon={FileText}
        iconBgColor="bg-success/10"
        iconColor="text-success"
      />
      <StatCard
        title="Days Remaining"
        value={daysRemaining}
        icon={CheckCircle2}
        iconBgColor="bg-secondary/20"
        iconColor="text-secondary-foreground"
      />
    </div>
  );
}
