import { Avatar, AvatarFallback, AvatarImage } from '../../primitives/avatar';
import { cn } from '../../utils/cn';
import { StreakChip } from './StreakChip';
import { TierBadge, type Tier } from './TierBadge';

export interface LeaderboardTableRow {
  rank: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  points_total: number;
  points_period: number;
  current_tier: Tier;
  current_streak: number;
}

export interface LeaderboardTableProps {
  rows: LeaderboardTableRow[];
  highlightUserId?: string | null;
  showPeriodCol?: boolean;
  className?: string;
}

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

export function LeaderboardTable({
  rows,
  highlightUserId,
  showPeriodCol = false,
  className,
}: LeaderboardTableProps) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950', className)}>
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="w-12 px-4 py-3">#</th>
            <th className="px-4 py-3">Member</th>
            <th className="hidden px-4 py-3 md:table-cell">Tier</th>
            <th className="hidden px-4 py-3 sm:table-cell">Streak</th>
            {showPeriodCol ? <th className="px-4 py-3 text-right">This month</th> : null}
            <th className="px-4 py-3 text-right">Total points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((r) => {
            const isMe = highlightUserId && r.user_id === highlightUserId;
            return (
              <tr
                key={r.user_id}
                className={cn(
                  'transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50',
                  isMe && 'bg-emerald-50/60 dark:bg-emerald-950/30'
                )}
              >
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">{r.rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {r.avatar_url ? <AvatarImage src={r.avatar_url} alt={r.full_name ?? ''} /> : null}
                      <AvatarFallback className="text-xs">{initials(r.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {r.full_name ?? 'Unknown'}
                        {isMe ? <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-400">(You)</span> : null}
                      </p>
                      {r.department ? (
                        <p className="truncate text-xs text-zinc-500">{r.department}</p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <TierBadge tier={r.current_tier} />
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <StreakChip weeks={r.current_streak} />
                </td>
                {showPeriodCol ? (
                  <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                    {r.points_period}
                  </td>
                ) : null}
                <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                  {r.points_total}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={showPeriodCol ? 6 : 5} className="px-4 py-12 text-center text-sm text-zinc-500">
                No leaderboard entries yet. Approve a milestone to start the points clock.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
