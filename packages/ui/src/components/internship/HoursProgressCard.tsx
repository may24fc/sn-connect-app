'use client';

import * as React from 'react';
import { Clock, Target, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../primitives/card';
import { Progress } from '../../primitives/progress';
import { Badge } from '../../primitives/badge';
import { cn } from '../../utils/cn';
import { calculateHoursProgress, getDaysRemaining, isOnTrack } from '../../types/internship.types';

interface HoursProgressCardProps {
  completedHours: number;
  requiredHours: number;
  startDate: string;
  endDate: string;
  className?: string;
  showDetails?: boolean;
}

export function HoursProgressCard({
  completedHours,
  requiredHours,
  startDate,
  endDate,
  className,
  showDetails = true,
}: HoursProgressCardProps): React.ReactNode {
  const progress = calculateHoursProgress(completedHours, requiredHours);
  const daysRemaining = getDaysRemaining(endDate);
  const onTrack = isOnTrack(completedHours, requiredHours, startDate, endDate);
  const remainingHours = Math.max(0, requiredHours - completedHours);

  const progressColor = progress >= 100
    ? 'bg-success'
    : onTrack
    ? 'bg-primary'
    : 'bg-warning';

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Hours Progress</CardTitle>
              <CardDescription>Track your internship hours</CardDescription>
            </div>
          </div>
          <Badge variant={onTrack ? 'success' : 'warning'}>
            {onTrack ? 'On Track' : 'Behind Schedule'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold">{completedHours}</span>
            <span className="text-muted-foreground">/ {requiredHours} hours</span>
          </div>
          <Progress
            value={progress}
            className="h-4"
            indicatorClassName={progressColor}
          />
          <p className="text-sm text-muted-foreground text-right">
            {progress}% complete
          </p>
        </div>

        {showDetails && (
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
              </div>
              <p className="text-lg font-semibold">{remainingHours}</p>
              <p className="text-xs text-muted-foreground">Hours Left</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
              </div>
              <p className="text-lg font-semibold">{daysRemaining}</p>
              <p className="text-xs text-muted-foreground">Days Left</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
              </div>
              <p className="text-lg font-semibold">
                {daysRemaining > 0 ? Math.ceil(remainingHours / daysRemaining * 5) : 0}
              </p>
              <p className="text-xs text-muted-foreground">Hrs/Week Needed</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface HoursProgressMiniProps {
  completedHours: number;
  requiredHours: number;
  startDate: string;
  endDate: string;
  className?: string;
}

export function HoursProgressMini({
  completedHours,
  requiredHours,
  startDate,
  endDate,
  className,
}: HoursProgressMiniProps): React.ReactNode {
  const progress = calculateHoursProgress(completedHours, requiredHours);
  const onTrack = isOnTrack(completedHours, requiredHours, startDate, endDate);

  const progressColor = progress >= 100
    ? 'bg-success'
    : onTrack
    ? 'bg-primary'
    : 'bg-warning';

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{completedHours} / {requiredHours} hrs</span>
        <span className={cn(
          'text-xs',
          onTrack ? 'text-success' : 'text-warning'
        )}>
          {progress}%
        </span>
      </div>
      <Progress
        value={progress}
        className="h-2"
        indicatorClassName={progressColor}
      />
    </div>
  );
}
