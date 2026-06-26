'use client';

import { Calendar, CircleHelp, Pencil, Trash2, Trophy } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { HoverActionButtons } from '../HoverActionButtons';
import { Button } from '../../primitives/button';
import { Card, CardContent } from '../../primitives/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../primitives/dialog';
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

function parseDescriptionSections(description: string): {
  goals: string[];
  scope: string[];
  successCriteria: string[];
} {
  const raw = description.trim();
  const sectionRegex = /(Goals|Scope|Success Criteria):\s*([\s\S]*?)(?=\n(?:Goals|Scope|Success Criteria):|$)/gi;
  const parsed: {
    goals?: string[];
    scope?: string[];
    successCriteria?: string[];
  } = {};

  for (const match of raw.matchAll(sectionRegex)) {
    const sectionName = match[1]?.toLowerCase();
    const lines = (match[2] ?? '')
      .split('\n')
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);

    if (sectionName === 'goals') parsed.goals = lines;
    if (sectionName === 'scope') parsed.scope = lines;
    if (sectionName === 'success criteria') parsed.successCriteria = lines;
  }

  if (!parsed.goals && !parsed.scope && !parsed.successCriteria) {
    return {
      goals: [raw],
      scope: [],
      successCriteria: [],
    };
  }

  return {
    goals: parsed.goals ?? [],
    scope: parsed.scope ?? [],
    successCriteria: parsed.successCriteria ?? [],
  };
}

function DescriptionSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const parsedDescription = description ? parseDescriptionSections(description) : null;
  const showHealthPill = progressPct < 100;

  const hoverActions = [
    ...(onEdit
      ? [
          {
            label: 'Edit project',
            icon: <Pencil className="h-3.5 w-3.5" />,
            onClick: onEdit,
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            label: 'Delete project',
            icon: <Trash2 className="h-3.5 w-3.5" />,
            onClick: onDelete,
            tone: 'danger' as const,
          },
        ]
      : []),
  ];

  return (
    <>
      <Card
        className={cn(
          'group relative cursor-pointer transition-all hover:border-indigo-500 hover:shadow-md',
          className
        )}
        onClick={onClick}
      >
        <HoverActionButtons actions={hoverActions} placement="top-right" className="gap-0.5" />
        <CardContent className="flex items-start gap-4 p-4">
          <ProgressRing value={progressPct} size={72} strokeWidth={6} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {name}
              </h3>
              {showHealthPill ? <HealthPill health={health} /> : null}
            </div>
            {description ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-0 text-xs font-medium text-zinc-600 hover:bg-transparent hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setDetailsOpen(true);
                }}
              >
                <CircleHelp className="mr-1 h-3.5 w-3.5" />
                View Full Details
              </Button>
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

      {description ? (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{name}</DialogTitle>
              <DialogDescription>Project description details</DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {parsedDescription ? (
                <div className="space-y-4">
                  <DescriptionSection title="Goals" items={parsedDescription.goals} />
                  <DescriptionSection title="Scope" items={parsedDescription.scope} />
                  <DescriptionSection
                    title="Success Criteria"
                    items={parsedDescription.successCriteria}
                  />
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
