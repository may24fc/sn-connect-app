import { Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../primitives/avatar';
import { cn } from '../../utils/cn';
import { StreakChip } from './StreakChip';
import { TierBadge, type Tier } from './TierBadge';

export interface PodiumEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
  tier: Tier;
  streak: number;
}

export interface LeaderboardPodiumProps {
  entries: PodiumEntry[]; // up to 3, sorted highest to lowest
  className?: string;
}

const ORDER: Array<{ idx: number; height: string; rank: number; ring: string; bg: string }> = [
  { idx: 1, height: 'h-32', rank: 2, ring: 'ring-zinc-300 dark:ring-zinc-600', bg: 'from-zinc-100 to-zinc-50 dark:from-zinc-800/60 dark:to-zinc-900' },
  { idx: 0, height: 'h-44', rank: 1, ring: 'ring-yellow-400', bg: 'from-yellow-100 to-amber-50 dark:from-yellow-900/30 dark:to-amber-950/20' },
  { idx: 2, height: 'h-24', rank: 3, ring: 'ring-amber-700/50', bg: 'from-orange-100 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20' },
];

function initials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function LeaderboardPodium({ entries, className }: LeaderboardPodiumProps) {
  return (
    <div className={cn('flex items-end justify-center gap-3 sm:gap-6', className)}>
      {ORDER.map((slot) => {
        const e = entries[slot.idx];
        if (!e) {
          return (
            <div key={slot.idx} className="flex w-24 flex-col items-center gap-2 sm:w-32">
              <div className={cn('flex w-full items-end justify-center rounded-t-lg bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900', slot.height)}>
                <span className="pb-2 text-2xl font-bold text-zinc-300 dark:text-zinc-700">{slot.rank}</span>
              </div>
            </div>
          );
        }
        return (
          <div key={e.user_id} className="flex w-24 flex-col items-center gap-2 sm:w-32">
            <div className="flex flex-col items-center gap-1">
              {slot.rank === 1 ? <Trophy className="h-5 w-5 text-yellow-500" /> : null}
              <Avatar className={cn('h-14 w-14 ring-2 sm:h-16 sm:w-16', slot.ring)}>
                {e.avatar_url ? <AvatarImage src={e.avatar_url} alt={e.full_name ?? ''} /> : null}
                <AvatarFallback>{initials(e.full_name)}</AvatarFallback>
              </Avatar>
              <p className="text-center text-sm font-medium leading-tight text-zinc-900 dark:text-zinc-100">
                {e.full_name ?? 'Unknown'}
              </p>
              <div className="flex items-center gap-1">
                <TierBadge tier={e.tier} showLabel={false} />
                <StreakChip weeks={e.streak} />
              </div>
            </div>
            <div
              className={cn(
                'flex w-full flex-col items-center justify-end rounded-t-lg bg-gradient-to-t pb-2',
                slot.bg,
                slot.height
              )}
            >
              <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{slot.rank}</span>
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                {e.points} pts
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
