'use client';

import { AlertCircle, ArrowRight, CheckCircle2, ClipboardList, Clock } from 'lucide-react';
import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import type { TaskDashboardStats } from '../../types/task.types';
import { cn } from '../../utils/cn';

export interface TaskSummaryCardsProps {
  stats: TaskDashboardStats;
  className?: string;
}

export function TaskSummaryCards({ stats, className }: TaskSummaryCardsProps): React.ReactNode {
  const cards = [
    {
      title: 'Total Tasks',
      value: stats.total,
      icon: ClipboardList,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      iconColor: 'text-warning',
      iconBg: 'bg-warning/10',
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: ArrowRight,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle2,
      iconColor: 'text-success',
      iconBg: 'bg-success/10',
    },
    {
      title: 'Overdue',
      value: stats.overdue,
      icon: AlertCircle,
      iconColor: 'text-error',
      iconBg: 'bg-error/10',
    },
  ];

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5', className)}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div
                className={cn('flex h-8 w-8 items-center justify-center rounded-lg', card.iconBg)}
              >
                <Icon className={cn('h-4 w-4', card.iconColor)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
