'use client';

import * as React from 'react';
import {
  Target,
  BarChart3,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '../../primitives/card';
import { cn } from '../../utils/cn';
import type { PerformanceDashboardStats } from '../../types/performance.types';

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
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PerformanceSummaryCardsProps {
  stats: PerformanceDashboardStats;
  className?: string;
}

export function PerformanceSummaryCards({
  stats,
  className,
}: PerformanceSummaryCardsProps): React.ReactNode {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <StatCard
        title="Total Employees"
        value={stats.totalEmployees}
        icon={Users}
        iconBgColor="bg-primary/10"
        iconColor="text-primary"
      />
      <StatCard
        title="OKR Progress"
        value={`${stats.averageOkrProgress}%`}
        subtitle={`${stats.okrsCompleted} completed, ${stats.okrsInProgress} in progress`}
        icon={Target}
        iconBgColor="bg-success/10"
        iconColor="text-success"
      />
      <StatCard
        title="KPI Performance"
        value={`${stats.averageKpiScore}%`}
        subtitle={`${stats.kpisOnTarget} on target, ${stats.kpisBelowTarget} below`}
        icon={BarChart3}
        iconBgColor="bg-warning/10"
        iconColor="text-warning"
      />
      <StatCard
        title="Reviews Completed"
        value={stats.reviewsCompleted}
        subtitle={`${stats.reviewsPendingSelf + stats.reviewsPendingManager} pending`}
        icon={FileText}
        iconBgColor="bg-secondary/20"
        iconColor="text-secondary-foreground"
      />
    </div>
  );
}

interface CycleProgressCardsProps {
  selfAssessmentComplete: number;
  selfAssessmentTotal: number;
  managerReviewComplete: number;
  managerReviewTotal: number;
  hrReviewComplete: number;
  hrReviewTotal: number;
  className?: string;
}

export function CycleProgressCards({
  selfAssessmentComplete,
  selfAssessmentTotal,
  managerReviewComplete,
  managerReviewTotal,
  hrReviewComplete,
  hrReviewTotal,
  className,
}: CycleProgressCardsProps): React.ReactNode {
  const selfPercent = selfAssessmentTotal > 0
    ? Math.round((selfAssessmentComplete / selfAssessmentTotal) * 100)
    : 0;
  const managerPercent = managerReviewTotal > 0
    ? Math.round((managerReviewComplete / managerReviewTotal) * 100)
    : 0;
  const hrPercent = hrReviewTotal > 0
    ? Math.round((hrReviewComplete / hrReviewTotal) * 100)
    : 0;

  return (
    <div className={cn('grid gap-4 sm:grid-cols-3', className)}>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Self-Assessments</p>
              <p className="text-2xl font-bold">
                {selfAssessmentComplete}/{selfAssessmentTotal}
              </p>
            </div>
            <div className="text-right">
              <span className={cn(
                'text-lg font-semibold',
                selfPercent >= 80 ? 'text-success' : selfPercent >= 50 ? 'text-warning' : 'text-error'
              )}>
                {selfPercent}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Manager Reviews</p>
              <p className="text-2xl font-bold">
                {managerReviewComplete}/{managerReviewTotal}
              </p>
            </div>
            <div className="text-right">
              <span className={cn(
                'text-lg font-semibold',
                managerPercent >= 80 ? 'text-success' : managerPercent >= 50 ? 'text-warning' : 'text-error'
              )}>
                {managerPercent}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">HR Finalized</p>
              <p className="text-2xl font-bold">
                {hrReviewComplete}/{hrReviewTotal}
              </p>
            </div>
            <div className="text-right">
              <span className={cn(
                'text-lg font-semibold',
                hrPercent >= 80 ? 'text-success' : hrPercent >= 50 ? 'text-warning' : 'text-error'
              )}>
                {hrPercent}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
