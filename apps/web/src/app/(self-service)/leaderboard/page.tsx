'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLeaderboard, type LeaderboardPeriod, type LeaderboardScope } from '@/hooks/useGamification';
import {
  Button,
  LeaderboardPodium,
  LeaderboardTable,
  Skeleton,
  type PodiumEntry,
} from '@hr-portal/ui';
import { Trophy } from 'lucide-react';
import { useState } from 'react';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<LeaderboardScope>('interns');
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const { data: rows, isLoading } = useLeaderboard(scope, period);

  const podium: PodiumEntry[] = (rows ?? []).slice(0, 3).map((r) => ({
    user_id: r.user_id,
    full_name: r.full_name,
    avatar_url: r.avatar_url,
    points: period === 'month' ? r.points_period : r.points_total,
    tier: r.current_tier,
    streak: r.current_streak,
  }));

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Leaderboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Earn points by completing milestones. Reach Production-Ready at 400 pts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            value={scope}
            onChange={setScope as (v: string) => void}
            options={[
              { value: 'interns', label: 'Interns' },
              { value: 'all', label: 'All' },
            ]}
          />
          <ToggleGroup
            value={period}
            onChange={setPeriod as (v: string) => void}
            options={[
              { value: 'all', label: 'All time' },
              { value: 'month', label: 'This month' },
            ]}
          />
        </div>
      </header>

      {isLoading ? (
        <Skeleton className="h-44" />
      ) : podium.length > 0 ? (
        <LeaderboardPodium entries={podium} />
      ) : null}

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <LeaderboardTable
          rows={rows ?? []}
          highlightUserId={user?.id ?? null}
          showPeriodCol={period === 'month'}
        />
      )}
    </div>
  );
}

function ToggleGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950">
      {options.map((o) => (
        <Button
          key={o.value}
          variant={value === o.value ? 'default' : 'ghost'}
          size="sm"
          className="h-7"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}