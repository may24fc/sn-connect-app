'use client';

import { Calendar, Trophy } from 'lucide-react';
import type * as React from 'react';
import { Card, CardContent } from '../../primitives/card';
import { cn } from '../../utils/cn';
import {
  ContributorAvatarStack,
  type ContributorAvatar,
} from './ContributorAvatarStack';
import { HealthPill, type ProjectHealth } from './HealthPill';
import { ProgressRing } from './ProgressRing';

export interface ProjectCardProps {
  name: string;
  description?: string | null;
  progressPct: number;
  health: ProjectHealth;
  pointsTotal: number;
  targetEndDate: string;
  contributors?: ContributorAvatar[];
  onClick?: () => void;
  className?: string;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function ProjectCard({
  name,
  description,
  progressPct,
  health,
  pointsTotal,
  targetEndDate,
  contributors = [],
  onClick,
  className,
}: ProjectCardProps): React.ReactElement {
  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all hover:border-indigo-500 hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <ProgressRing value={progressPct} size={72} strokeWidth={6} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {name}
            </h3>
            <HealthPill health={health} />
          </div>
          {description ? (
            <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(targetEndDate)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span className="tabular-nums font-medium text-zinc-700 dark:text-zinc-300">
                  {pointsTotal}
                </span>
              </span>
            </div>
            {contributors.length > 0 ? (
              <ContributorAvatarStack contributors={contributors} max={3} />
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
