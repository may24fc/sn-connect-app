 'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLeaderboard, type LeaderboardPeriod, type LeaderboardScope } from '@/hooks/useGamification';
import { COMPLEXITY_TIER_BADGE_CLASSES } from '@/lib/schemas/project.schema';
import {
  LeaderboardPodium,
  LeaderboardTable,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  ToggleGroup,
  cn,
  type PodiumEntry,
  type Tier,
} from '@hr-portal/ui';
import { Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LeaderboardUserDrawer } from './_components/LeaderboardUserDrawer';

type LeagueFilter = 'all' | Tier;

// Complexity-tier pill colors — same dark-bg/vibrant-text language as the League tags,
// so the gamified XP vocabulary reads consistently across the platform.
function XpTierPill({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        'mx-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide',
        className
      )}
    >
      {label}
    </span>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<LeaderboardScope>('interns');
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [league, setLeague] = useState<LeagueFilter>('all');
  const { data: rows, isLoading } = useLeaderboard(scope, period);

  // Drawer state for admin view
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredRows = useMemo(() => {
    if (league === 'all') return rows ?? [];
    return (rows ?? []).filter((r) => r.current_tier === league);
  }, [rows, league]);

  const podium: PodiumEntry[] = filteredRows.slice(0, 3).map((r) => ({
    user_id: r.user_id,
    full_name: r.full_name,
    avatar_url: r.avatar_url,
    points: period === 'month' ? r.points_period : r.points_total,
    tier: r.current_tier,
    streak: r.current_streak,
    badge_count: r.badge_count ?? 0,
    mastery_title: r.mastery_title ?? null,
  }));

  function handleRowClick(row: any) {
    setSelectedUserId(row.user_id);
    setDrawerOpen(true);
  }

  const selectedUser = rows?.find((r) => r.user_id === selectedUserId) ?? null;

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Leaderboard
          </h1>
          <p className="flex flex-wrap items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
            Earn XP from
            <XpTierPill label="Routine (50)" className={COMPLEXITY_TIER_BADGE_CLASSES.routine} />
            to
            <XpTierPill label="Epic (600)" className={COMPLEXITY_TIER_BADGE_CLASSES.epic} />
            milestones. Reach Production-Ready at 4,000 XP.
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
            buttonClassName="h-7"
            options={[
              { value: 'all', label: 'All time' },
              { value: 'month', label: 'This month' },
            ]}
          />
          <Select value={league} onValueChange={(value) => setLeague(value as LeagueFilter)}>
            <SelectTrigger className="h-7 w-[170px]">
              <SelectValue placeholder="All Leagues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leagues</SelectItem>
              <SelectItem value="bronze">Bronze</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="production_ready">Production-Ready</SelectItem>
            </SelectContent>
          </Select>
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
          rows={filteredRows}
          highlightUserId={user?.id ?? null}
          showPeriodCol={period === 'month'}
          onRowClick={handleRowClick}
        />
      )}

      <LeaderboardUserDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelectedUserId(null);
        }}
        userId={selectedUserId}
        fullName={selectedUser?.full_name ?? null}
        avatarUrl={selectedUser?.avatar_url ?? null}
        department={selectedUser?.department ?? null}
      />
    </div>
  );
}

