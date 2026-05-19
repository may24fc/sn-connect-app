'use client';

import { Calendar, Pencil, Trash2, Trophy } from 'lucide-react';
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
  onEdit?: () => void;
  onDelete?: () => void;
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
  onEdit,
  onDelete,
  className,
}: ProjectCardProps): React.ReactElement {
  return (
    <Card
      className={cn(
        'group relative cursor-pointer transition-all hover:border-indigo-500 hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      {onEdit || onDelete ? (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {onEdit ? (
            <button
              type="button"
              aria-label="Edit project"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onEdit();
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              aria-label="Delete project"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}
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
