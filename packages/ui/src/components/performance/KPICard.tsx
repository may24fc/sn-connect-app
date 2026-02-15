'use client';

import { BarChart3, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type * as React from 'react';
import { Badge } from '../../primitives/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { Progress } from '../../primitives/progress';
import type { KPI } from '../../types/performance.types';
import { cn } from '../../utils/cn';

interface KPICardProps {
  kpi: KPI;
  className?: string;
  compact?: boolean;
}

function getScoreStatus(score: number): {
  variant: 'success' | 'warning' | 'error';
  label: string;
  Icon: React.ElementType;
} {
  if (score >= 100) {
    return { variant: 'success', label: 'On Target', Icon: TrendingUp };
  }
  if (score >= 80) {
    return { variant: 'warning', label: 'Near Target', Icon: Minus };
  }
  return { variant: 'error', label: 'Below Target', Icon: TrendingDown };
}

export function KPICard({ kpi, className, compact = false }: KPICardProps): React.ReactNode {
  const { variant, label, Icon } = getScoreStatus(kpi.score);
  const progressValue = Math.min(kpi.score, 150); // Cap at 150% for visualization

  const progressColor =
    kpi.score >= 100 ? 'bg-success' : kpi.score >= 80 ? 'bg-warning' : 'bg-error';

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between p-4 rounded-lg border border-border',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{kpi.name}</p>
            <p className="text-xs text-muted-foreground">
              {kpi.actual} / {kpi.target} {kpi.unit}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p
              className={cn('text-lg font-bold', {
                'text-success': kpi.score >= 100,
                'text-warning': kpi.score >= 80 && kpi.score < 100,
                'text-error': kpi.score < 80,
              })}
            >
              {kpi.score}%
            </p>
          </div>
          <Badge variant={variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {label}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{kpi.name}</CardTitle>
              {kpi.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{kpi.description}</p>
              )}
            </div>
          </div>
          <Badge variant={variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Target</p>
            <p className="text-lg font-semibold">{kpi.target}</p>
            <p className="text-xs text-muted-foreground">{kpi.unit}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Actual</p>
            <p className="text-lg font-semibold">{kpi.actual}</p>
            <p className="text-xs text-muted-foreground">{kpi.unit}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Score</p>
            <p
              className={cn('text-lg font-bold', {
                'text-success': kpi.score >= 100,
                'text-warning': kpi.score >= 80 && kpi.score < 100,
                'text-error': kpi.score < 80,
              })}
            >
              {kpi.score}%
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress to Target</span>
            <span className="font-medium">{kpi.score}%</span>
          </div>
          <Progress value={progressValue} className="h-2" indicatorClassName={progressColor} />
        </div>

        {kpi.weight && (
          <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border pt-3">
            <span>Weight in Overall Score</span>
            <span className="font-medium">{kpi.weight}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface KPIListProps {
  kpis: Array<KPI>;
  compact?: boolean;
  emptyMessage?: string;
}

export function KPIList({
  kpis,
  compact = false,
  emptyMessage = 'No KPIs found',
}: KPIListProps): React.ReactNode {
  if (kpis.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', compact && 'space-y-2')}>
      {kpis.map((kpi) => (
        <KPICard key={kpi.id} kpi={kpi} compact={compact} />
      ))}
    </div>
  );
}

interface KPISummaryProps {
  kpis: Array<KPI>;
  className?: string;
}

export function KPISummary({ kpis, className }: KPISummaryProps): React.ReactNode {
  if (kpis.length === 0) return null;

  const totalWeight = kpis.reduce((sum, kpi) => sum + (kpi.weight || 0), 0);
  const weightedScore = kpis.reduce((sum, kpi) => {
    const weight = kpi.weight || 100 / kpis.length;
    return sum + (kpi.score * weight) / 100;
  }, 0);
  const averageScore =
    totalWeight > 0 ? weightedScore : kpis.reduce((sum, kpi) => sum + kpi.score, 0) / kpis.length;

  const onTarget = kpis.filter((kpi) => kpi.score >= 100).length;
  const nearTarget = kpis.filter((kpi) => kpi.score >= 80 && kpi.score < 100).length;
  const belowTarget = kpis.filter((kpi) => kpi.score < 80).length;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{Math.round(averageScore)}%</p>
            <p className="text-xs text-muted-foreground">Avg. Score</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-success">{onTarget}</p>
            <p className="text-xs text-muted-foreground">On Target</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-warning">{nearTarget}</p>
            <p className="text-xs text-muted-foreground">Near Target</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-error">{belowTarget}</p>
            <p className="text-xs text-muted-foreground">Below Target</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
