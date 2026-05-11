'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useWarRoomOverview } from '@/hooks/useGamification';
import {
  Badge,
  Button,
  HealthPill,
  ProgressRing,
  Skeleton,
  StreakChip,
  TierBadge,
} from '@hr-portal/ui';
import { Activity, AlertTriangle, FolderKanban, Target, Trophy } from 'lucide-react';
import Link from 'next/link';

export default function WarRoomPage() {
  const { user } = useAuth();
  const { data, isLoading } = useWarRoomOverview();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-sm text-zinc-500">
        You need admin access to view the War Room.
      </div>
    );
  }

  const totals = data?.totals;
  const interns = data?.interns ?? [];
  const departments = data?.departments ?? [];

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          War Room
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Cross-intern project health, momentum, and points at a glance.
        </p>
      </header>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatTile
          icon={<FolderKanban className="h-4 w-4" />}
          label="Total projects"
          value={totals?.projects ?? 0}
          isLoading={isLoading}
        />
        <StatTile
          icon={<Activity className="h-4 w-4 text-emerald-600" />}
          label="On track"
          value={totals?.on_track ?? 0}
          isLoading={isLoading}
        />
        <StatTile
          icon={<Target className="h-4 w-4 text-amber-600" />}
          label="At risk"
          value={totals?.at_risk ?? 0}
          isLoading={isLoading}
        />
        <StatTile
          icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
          label="Overdue"
          value={totals?.overdue ?? 0}
          isLoading={isLoading}
        />
        <StatTile
          icon={<Trophy className="h-4 w-4 text-yellow-500" />}
          label="Total points"
          value={totals?.points ?? 0}
          isLoading={isLoading}
        />
      </div>

      {/* Departmental heatmap */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          By department
        </h2>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2 text-center">Interns</th>
                <th className="px-4 py-2 text-center">On track</th>
                <th className="px-4 py-2 text-center">At risk</th>
                <th className="px-4 py-2 text-center">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6">
                    <Skeleton className="h-6" />
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                    No departments to display.
                  </td>
                </tr>
              ) : (
                departments.map((d) => (
                  <tr key={d.department}>
                    <td className="px-4 py-2 font-medium">{d.department}</td>
                    <td className="px-4 py-2 text-center">{d.intern_count}</td>
                    <td className="px-4 py-2 text-center">
                      <Cell value={d.on_track} variant="emerald" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Cell value={d.at_risk} variant="amber" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Cell value={d.overdue} variant="red" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bento grid of intern cards */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Interns
          </h2>
          <Link href="/leaderboard">
            <Button variant="outline" size="sm">
              <Trophy className="mr-2 h-4 w-4" />
              Leaderboard
            </Button>
          </Link>
        </div>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : interns.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No interns with active projects yet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {interns.map((i) => (
              <Link
                key={i.user_id}
                href={`/admin/interns/${i.user_id}`}
                className="group rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                      {i.full_name ?? 'Unnamed intern'}
                    </p>
                    {i.department ? (
                      <p className="truncate text-xs text-zinc-500">{i.department}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <TierBadge tier={i.current_tier} />
                      <StreakChip weeks={i.current_streak} />
                      <Badge variant="outline" className="text-xs">
                        <Trophy className="mr-1 h-3 w-3" />
                        {i.total_points} pts
                      </Badge>
                    </div>
                  </div>
                  <ProgressRing value={i.avg_progress} size={64} strokeWidth={6} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">
                    {i.project_count} project{i.project_count === 1 ? '' : 's'}
                  </span>
                  <div className="flex items-center gap-1">
                    {i.on_track > 0 ? <HealthPill health="on_track" /> : null}
                    {i.at_risk > 0 ? <HealthPill health="at_risk" /> : null}
                    {i.overdue > 0 ? <HealthPill health="overdue" /> : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
        {icon}
        {label}
      </div>
      {isLoading ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      )}
    </div>
  );
}

function Cell({ value, variant }: { value: number; variant: 'emerald' | 'amber' | 'red' }) {
  if (value === 0) return <span className="text-zinc-300">—</span>;
  const cls =
    variant === 'emerald'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
      : variant === 'amber'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
        : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  return (
    <span className={`inline-flex min-w-7 items-center justify-center rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {value}
    </span>
  );
}
