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

// Dark, saturated capsule tags — modeled after competitive-gaming rank badges (Valorant/League) for max contrast.
const TIER_CONFIG: Record<
  Tier,
  { label: string; icon: LucideIcon; classes: string }
> = {
  bronze: {
    label: 'Bronze League',
    icon: Medal,
    classes: 'bg-amber-950 text-amber-300 ring-1 ring-amber-700/70 dark:bg-amber-950 dark:text-amber-300',
  },
  silver: {
    label: 'Silver League',
    icon: Award,
    classes: 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-500/70 dark:bg-zinc-800 dark:text-zinc-100',
  },
  gold: {
    label: 'Gold League',
    icon: Crown,
    classes:
      'bg-yellow-950 text-yellow-300 ring-1 ring-yellow-600/70 shadow-[0_0_10px_rgba(250,204,21,0.25)] dark:bg-yellow-950 dark:text-yellow-300',
  },
  production_ready: {
    label: 'Production-Ready',
    icon: Sparkles,
    classes:
      'bg-violet-950 text-fuchsia-300 ring-1 ring-fuchsia-500/60 shadow-[0_0_12px_rgba(217,70,239,0.35)] dark:bg-violet-950 dark:text-fuchsia-300',
  },
};

export function TierBadge({ tier, className, showLabel = true }: TierBadgeProps) {
  const cfg = TIER_CONFIG[tier];
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border-0 px-2.5 py-0.5 font-semibold tracking-wide',
        cfg.classes,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel ? cfg.label : null}
    </Badge>
  );
}

export const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 1500,
  production_ready: 4000,
} as const;
