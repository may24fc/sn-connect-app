import type { LucideIcon } from 'lucide-react';
import { Award, Crown, Medal, Sparkles } from 'lucide-react';
import { Badge } from '../../primitives/badge';
import { cn } from '../../utils/cn';

export type Tier = 'bronze' | 'silver' | 'gold' | 'production_ready';

export interface TierBadgeProps {
  tier: Tier;
  className?: string;
  showLabel?: boolean;
}

const TIER_CONFIG: Record<
  Tier,
  { label: string; icon: LucideIcon; classes: string }
> = {
  bronze: {
    label: 'Bronze',
    icon: Medal,
    classes:
      'bg-amber-100 text-amber-800 ring-1 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
  },
  silver: {
    label: 'Silver',
    icon: Award,
    classes:
      'bg-zinc-200 text-zinc-800 ring-1 ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-600',
  },
  gold: {
    label: 'Gold',
    icon: Crown,
    classes:
      'bg-yellow-200 text-yellow-900 ring-1 ring-yellow-400 dark:bg-yellow-900/40 dark:text-yellow-200 dark:ring-yellow-700',
  },
  production_ready: {
    label: 'Production-Ready',
    icon: Sparkles,
    classes:
      'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white ring-1 ring-violet-300 dark:ring-violet-700',
  },
};

export function TierBadge({ tier, className, showLabel = true }: TierBadgeProps) {
  const cfg = TIER_CONFIG[tier];
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={cn('inline-flex items-center gap-1 border-0 px-2 py-0.5 font-medium', cfg.classes, className)}
    >
      <Icon className="h-3 w-3" />
      {showLabel ? cfg.label : null}
    </Badge>
  );
}

export const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 50,
  gold: 150,
  production_ready: 400,
} as const;
