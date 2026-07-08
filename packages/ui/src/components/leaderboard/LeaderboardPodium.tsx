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
  // v2 gamification
  badge_count?: number | null;
  mastery_title?: string | null;
}

export interface LeaderboardPodiumProps {
  entries: PodiumEntry[]; // up to 3, sorted highest to lowest
  className?: string;
}

const ORDER: Array<{
  idx: number;
  height: string;
  rank: number;
  ring: string;
  bg: string;
  glow?: string;
  avatarFallback: string;
  medallion: string;
}> = [
  {
    idx: 1,
    height: 'h-32',
    rank: 2,
    ring: 'ring-zinc-300 dark:ring-zinc-600',
    bg: 'from-zinc-200 to-zinc-50 dark:from-zinc-800/70 dark:to-zinc-900',
    avatarFallback: 'bg-gradient-to-br from-slate-300 to-zinc-500 text-white',
    medallion: 'bg-gradient-to-br from-zinc-200 via-zinc-300 to-zinc-400 text-zinc-800 ring-2 ring-white/80',
  },
  {
    idx: 0,
    height: 'h-48',
    rank: 1,
    ring: 'ring-yellow-400',
    bg: 'from-yellow-200 via-amber-100 to-amber-50 dark:from-yellow-800/40 dark:via-amber-900/30 dark:to-amber-950/20',
    glow: 'shadow-[0_0_28px_rgba(250,204,21,0.45)] ring-2 ring-yellow-300/70',
    avatarFallback: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 text-yellow-950',
    medallion:
      'bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 text-yellow-950 shadow-[0_0_16px_rgba(250,204,21,0.6)] ring-2 ring-yellow-100',
  },
  {
    idx: 2,
    height: 'h-24',
    rank: 3,
    ring: 'ring-amber-700/50',
    bg: 'from-orange-200 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/20',
    avatarFallback: 'bg-gradient-to-br from-orange-300 via-amber-600 to-orange-800 text-white',
    medallion: 'bg-gradient-to-br from-orange-300 via-amber-500 to-orange-700 text-orange-950 ring-2 ring-white/80',
  },
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

function ordinal(rank: number) {
  return rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd';
}

export function LeaderboardPodium({ entries, className }: LeaderboardPodiumProps) {
  return (
    <div className={cn('flex items-end justify-center gap-3 sm:gap-6', className)}>
      {ORDER.map((slot) => {
        const e = entries[slot.idx];
        if (!e) {
          return (
            <div key={slot.idx} className="flex w-24 flex-col items-center gap-2 sm:w-32">
              <div className={cn('flex w-full items-end justify-center overflow-hidden rounded-t-lg bg-gradient-to-t from-zinc-100 to-zinc-50 pb-2 dark:from-zinc-800 dark:to-zinc-900', slot.height)}>
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-sm font-extrabold text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600')}>
                  {ordinal(slot.rank)}
                </span>
              </div>
            </div>
          );
        }
        return (
          <div key={e.user_id} className="flex w-24 flex-col items-center gap-2 sm:w-32">
            <div className="flex flex-col items-center gap-1">
              {slot.rank === 1 ? <Trophy className="h-5 w-5 animate-pulse text-yellow-500" /> : null}
              <Avatar className={cn('h-14 w-14 ring-2 sm:h-16 sm:w-16', slot.ring)}>
                {e.avatar_url ? <AvatarImage src={e.avatar_url} alt={e.full_name ?? ''} /> : null}
                <AvatarFallback className={cn('font-bold', slot.avatarFallback)}>
                  {initials(e.full_name)}
                </AvatarFallback>
              </Avatar>
              <p className="text-center text-sm font-medium leading-tight text-zinc-900 dark:text-zinc-100">
                {e.full_name ?? 'Unknown'}
              </p>
              {e.mastery_title ? (
                <p className="text-center text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                  {e.mastery_title}
                </p>
              ) : null}
              <div className="flex items-center gap-1">
                <TierBadge tier={e.tier} showLabel={false} />
                <StreakChip weeks={e.streak} />
                {e.badge_count && e.badge_count > 0 ? (
                  <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    🏅 {e.badge_count}
                  </span>
                ) : null}
              </div>
            </div>
            <div
              className={cn(
                'relative flex w-full flex-col items-center justify-end overflow-hidden rounded-t-lg bg-gradient-to-t pb-2',
                slot.bg,
                slot.height,
                slot.glow
              )}
            >
              {slot.rank === 1 ? (
                <div className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              ) : null}
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold tracking-tight',
                  slot.medallion
                )}
              >
                {ordinal(slot.rank)}
              </span>
              <span className="mt-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                {e.points} pts
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
