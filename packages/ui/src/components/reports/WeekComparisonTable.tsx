'use client';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../primitives/table';
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
    if (trend === 'stable') return 'text-zinc-400 dark:text-zinc-500';
    if (trend === 'up') return isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    return isPositive ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {comparison.currentWeek.label}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatPeriodLabel(comparison.currentWeek.startDate, comparison.currentWeek.endDate)}
            </p>
          </div>
          <div className="space-y-2">
            {comparison.metrics.slice(0, 4).map((metric) => (
              <div key={metric.name} className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">{metric.name}</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {formatValue(metric.currentValue, metric.category)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {comparison.previousWeek.label}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatPeriodLabel(comparison.previousWeek.startDate, comparison.previousWeek.endDate)}
            </p>
          </div>
          <div className="space-y-2">
            {comparison.metrics.slice(0, 4).map((metric) => (
              <div key={metric.name} className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">{metric.name}</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {formatValue(metric.previousValue, metric.category)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="bg-card border border-zinc-200 dark:border-zinc-800 rounded-lg">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Metric Breakdown</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Detailed comparison of all metrics</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Previous</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.metrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-zinc-500 dark:text-zinc-400">
                    No metrics to compare.
                  </TableCell>
                </TableRow>
              ) : (
                comparison.metrics.map((metric) => {
                  const isRevenueMetric =
                    metric.category === 'Revenue' || metric.name.includes('Revenue');
                  const isPositiveTrend =
                    metric.trend === 'up' ? isRevenueMetric : !isRevenueMetric;

                  return (
                    <TableRow key={metric.name}>
                      <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                        {metric.name}
                        <span className="ml-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                          {metric.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-zinc-600 dark:text-zinc-400">
                        {formatValue(metric.previousValue, metric.category)}
                      </TableCell>
                      <TableCell className="text-right text-zinc-900 dark:text-zinc-50">
                        {formatValue(metric.currentValue, metric.category)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-sm',
                            getTrendColor(metric.trend, isPositiveTrend)
                          )}
                        >
                          {getTrendIcon(metric.trend)}
                          {metric.changePercent > 0 ? '+' : ''}
                          {metric.changePercent.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
