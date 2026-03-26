'use client';

import { BarChart3, DollarSign, MousePointerClick, Target, TrendingUp } from 'lucide-react';
import type * as React from 'react';
import { Badge } from '../../primitives/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../primitives/card';
import { cn } from '../../utils/cn';

// --- Types ---

export interface KPICardData {
  name: string;
  label: string;
  value: number | string;
  unit: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: string;
  };
}

export interface RoleDashboardWidgetProps {
  roleType: string;
  roleLabel: string;
  kpiData: KPICardData[];
  onManageKPIs?: () => void;
  className?: string;
}

// --- KPI Icon Map ---

const KPI_ICONS: Record<string, React.ElementType> = {
  spend: DollarSign,
  cpa: Target,
  roas: TrendingUp,
  conversions: MousePointerClick,
  ctr: MousePointerClick,
  impressions: BarChart3,
  deals_closed: Target,
  revenue_generated: DollarSign,
  pipeline_value: DollarSign,
  leads_generated: Target,
  posts_published: BarChart3,
  engagement_rate: TrendingUp,
  prs_merged: Target,
  issues_closed: Target,
};

const TREND_COLORS = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-red-600 dark:text-red-400',
  stable: 'text-zinc-500 dark:text-zinc-400',
};

function formatKPIValue(value: number | string, unit: string): string {
  if (typeof value === 'string') return value;

  if (unit === 'USD' || unit === 'EUR' || unit === 'PHP') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: unit,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (unit === '%') {
    return `${value.toFixed(2)}%`;
  }

  if (unit === 'ratio') {
    return `${value.toFixed(2)}x`;
  }

  if (unit === 'count') {
    return new Intl.NumberFormat('en-US').format(value);
  }

  return String(value);
}

// --- KPI Card ---

function KPIMetricCard({ data }: { data: KPICardData }): React.ReactNode {
  const IconComponent = KPI_ICONS[data.name] || BarChart3;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {data.label}
        </span>
        <IconComponent className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
          {formatKPIValue(data.value, data.unit)}
        </span>
        {data.trend && (
          <span className={cn('text-xs font-medium pb-0.5', TREND_COLORS[data.trend.direction])}>
            {data.trend.direction === 'up' ? '↑' : data.trend.direction === 'down' ? '↓' : '→'}{' '}
            {data.trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

// --- Main Widget ---

export function RoleDashboardWidget({
  roleType,
  roleLabel,
  kpiData,
  onManageKPIs,
  className,
}: RoleDashboardWidgetProps): React.ReactNode {
  if (kpiData.length === 0) {
    return null;
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3
              className="h-4.5 w-4.5 text-zinc-700 dark:text-zinc-400"
              strokeWidth={1.5}
            />
            <div>
              <CardTitle className="text-base">{roleLabel} KPIs</CardTitle>
              <CardDescription className="text-xs">Your latest performance metrics</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {roleType.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {kpiData.map((data) => (
            <KPIMetricCard key={data.name} data={data} />
          ))}
        </div>
        {onManageKPIs && (
          <button
            type="button"
            onClick={onManageKPIs}
            className="mt-3 text-xs font-medium text-zinc-700 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Log KPI Values →
          </button>
        )}
      </CardContent>
    </Card>
  );
}
