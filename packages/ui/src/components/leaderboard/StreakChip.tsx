import { Flame } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface StreakChipProps {
  weeks: number;
  className?: string;
}

export function StreakChip({ weeks, className }: StreakChipProps) {
  if (weeks <= 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
          className
        )}
      >
        <Flame className="h-3 w-3" />0w
      </span>
    );
  }
  const intensity =
    weeks >= 8
      ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
      : weeks >= 4
        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        intensity,
        className
      )}
    >
      <Flame className="h-3 w-3" />
      {weeks}w
    </span>
  );
}
