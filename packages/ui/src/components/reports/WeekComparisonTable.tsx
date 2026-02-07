'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../primitives/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../primitives/table';
import { Badge } from '../../primitives/badge';
import { cn } from '../../utils/cn';
import type { WeekComparison } from './types';
import { formatPeriodLabel } from './types';

interface WeekComparisonTableProps {
  comparison: WeekComparison;
  className?: string;
}

export function WeekComparisonTable({
  comparison,
  className,
}: WeekComparisonTableProps): React.ReactNode {
  const formatValue = (value: number, category: string): string => {
    if (category === 'Revenue' || category === 'Expenditure') {
      return `PHP ${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    }
    return value.toLocaleString('en-US');
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable'): React.ReactNode => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />;
      case 'down':
        return <TrendingDown className="h-3 w-3" />;
      case 'stable':
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isPositive: boolean): string => {
    if (trend === 'stable') return 'text-slate-500';
    if (trend === 'up') return isPositive ? 'text-green-600' : 'text-red-600';
    return isPositive ? 'text-red-600' : 'text-green-600';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Week */}
        <Card>
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-base">{comparison.currentWeek.label}</CardTitle>
            <CardDescription>
              {formatPeriodLabel(comparison.currentWeek.startDate, comparison.currentWeek.endDate)}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {comparison.metrics.slice(0, 4).map((metric) => (
              <div key={metric.name} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{metric.name}</span>
                <span className="font-semibold">{formatValue(metric.currentValue, metric.category)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Previous Week */}
        <Card>
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-base">{comparison.previousWeek.label}</CardTitle>
            <CardDescription>
              {formatPeriodLabel(comparison.previousWeek.startDate, comparison.previousWeek.endDate)}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {comparison.metrics.slice(0, 4).map((metric) => (
              <div key={metric.name} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{metric.name}</span>
                <span className="font-semibold">{formatValue(metric.previousValue, metric.category)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Metric Breakdown Comparison</CardTitle>
          <CardDescription>Detailed comparison of all metrics week-over-week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Previous Week</TableHead>
                  <TableHead className="text-right">Current Week</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.metrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No metrics to compare.
                    </TableCell>
                  </TableRow>
                ) : (
                  comparison.metrics.map((metric) => {
                    const isRevenueMetric = metric.category === 'Revenue' || metric.name.includes('Revenue');
                    const isPositiveTrend = metric.trend === 'up' ? isRevenueMetric : !isRevenueMetric;

                    return (
                      <TableRow key={metric.name}>
                        <TableCell className="font-medium">{metric.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{metric.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatValue(metric.previousValue, metric.category)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatValue(metric.currentValue, metric.category)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className={cn('flex items-center gap-1', getTrendColor(metric.trend, isPositiveTrend))}>
                              {getTrendIcon(metric.trend)}
                              <span className="font-semibold">
                                {metric.changePercent > 0 ? '+' : ''}
                                {metric.changePercent.toFixed(1)}%
                              </span>
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
