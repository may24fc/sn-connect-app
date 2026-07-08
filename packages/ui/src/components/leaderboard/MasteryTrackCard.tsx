import { Bot, Clapperboard, DollarSign, Palette, TrendingUp, Users, Zap } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  MASTERY_LEVEL_THRESHOLDS,
  formatMasteryTitle,
} from '../../constants/mastery';

export interface MasteryTrackCardProps {
  department: string;
  masteryPoints: number;
  masteryLevel: number;
  className?: string;
}

// Department → icon + accent color (title stem comes from the shared mastery constant)
const DEPT_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; barColor: string }
> = {
  'AI & Automation': {
    icon: Bot,
    color: 'text-violet-600 dark:text-violet-400',
    barColor: 'from-violet-500 via-fuchsia-500 to-cyan-400',
  },
  Marketing: {
    icon: TrendingUp,
    color: 'text-emerald-600 dark:text-emerald-400',
    barColor: 'from-emerald-500 to-emerald-600',
  },
  HR: {
    icon: Users,
    color: 'text-sky-600 dark:text-sky-400',
    barColor: 'from-sky-500 to-sky-600',
  },
  Design: {
    icon: Palette,
    color: 'text-pink-600 dark:text-pink-400',
    barColor: 'from-pink-500 via-fuchsia-500 to-pink-600',
  },
  'Graphic Design': {
    icon: Palette,
    color: 'text-pink-600 dark:text-pink-400',
    barColor: 'from-pink-500 via-fuchsia-500 to-pink-600',
  },
  Video: {
    icon: Clapperboard,
    color: 'text-rose-600 dark:text-rose-400',
    barColor: 'from-rose-500 to-rose-600',
  },
  Accounting: {
    icon: DollarSign,
    color: 'text-amber-600 dark:text-amber-400',
    barColor: 'from-amber-500 to-amber-600',
  },
};

/** Returns the XP needed for the next level (null if max level). */
function getNextLevelXp(level: number): number | null {
  if (level >= 7) return null;
  return MASTERY_LEVEL_THRESHOLDS[level] ?? null; // index = next level - 1
}

export function MasteryTrackCard({
  department,
  masteryPoints,
  masteryLevel,
  className,
}: MasteryTrackCardProps) {
  const cfg = DEPT_CONFIG[department] ?? {
    icon: Zap,
    color: 'text-zinc-600 dark:text-zinc-400',
    barColor: 'from-indigo-500 to-indigo-600',
  };

  const Icon = cfg.icon;
  const title = formatMasteryTitle(department, masteryLevel);
  const nextXp = getNextLevelXp(masteryLevel);
  const isMaxed = nextXp === null;

  const currentFloor = MASTERY_LEVEL_THRESHOLDS[masteryLevel - 1] ?? 0;
  const progressPct =
    nextXp !== null
      ? Math.min(100, Math.round(((masteryPoints - currentFloor) / (nextXp - currentFloor)) * 100))
      : 100;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-shadow',
        isMaxed
          ? 'border-amber-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50 shadow-sm dark:border-amber-700/60 dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-amber-950/20'
          : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50',
        className
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800',
          cfg.color
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn('flex items-center gap-1 text-sm font-semibold', cfg.color)}>
            {title}
            {isMaxed ? <span aria-hidden>🏆</span> : null}
          </p>
          <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            {masteryPoints.toLocaleString()} XP
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{department}</p>

        {/* Progress bar */}
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          {isMaxed ? (
            <div className="relative h-full w-full overflow-hidden rounded-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            </div>
          ) : (
            <div
              className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', cfg.barColor)}
              style={{ width: `${progressPct}%` }}
            />
          )}
        </div>
        <p
          className={cn(
            'mt-0.5 text-[10px]',
            isMaxed ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500'
          )}
        >
          {nextXp !== null
            ? `${(nextXp - masteryPoints).toLocaleString()} XP to Level ${masteryLevel + 1}`
            : 'Max level reached — mastery achieved'}
        </p>
      </div>
    </div>
  );
}
