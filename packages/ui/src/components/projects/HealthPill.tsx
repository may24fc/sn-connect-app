'use client';

import type * as React from 'react';
import { Badge } from '../../primitives/badge';

export type ProjectHealth = 'on_track' | 'at_risk' | 'overdue';

const HEALTH_LABEL: Record<ProjectHealth, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  overdue: 'Overdue',
};

const HEALTH_CLASSES: Record<ProjectHealth, string> = {
  on_track:
    'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400',
  at_risk:
    'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400',
  overdue: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400',
};

export interface HealthPillProps {
  health: ProjectHealth;
  className?: string;
}

export function HealthPill({ health, className }: HealthPillProps): React.ReactElement {
  return (
    <Badge variant="secondary" className={`${HEALTH_CLASSES[health]} ${className ?? ''}`}>
      {HEALTH_LABEL[health]}
    </Badge>
  );
}
