'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  useFeaturedMasteryPreference,
  useUpdateFeaturedMasteryPreference,
  useUserBadges,
  useUserMastery,
} from '@/hooks/useGamification';
import {
  BadgeIcon,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  MasteryTrackCard,
  RARITY_LABEL,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  cn,
  getBadgeRowTone,
  getRarityContainerClasses,
  getRarityTagClasses,
  useToast,
} from '@hr-portal/ui';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

export default function AchievementsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data: mastery, isLoading: masteryLoading } = useUserMastery(userId);
  const { data: badges, isLoading: badgesLoading } = useUserBadges(userId);
  const { data: preference, isLoading: preferenceLoading } = useFeaturedMasteryPreference(userId);
  const updateFeaturedMastery = useUpdateFeaturedMasteryPreference(userId);

  const sortedMastery = useMemo(
    () =>
      [...(mastery ?? [])].sort((a, b) => {
        if (b.mastery_level !== a.mastery_level) return b.mastery_level - a.mastery_level;
        if (b.mastery_points !== a.mastery_points) return b.mastery_points - a.mastery_points;
        return a.department.localeCompare(b.department);
      }),
    [mastery]
  );

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            className="mb-2 -ml-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Achievements
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Your complete record of domain mastery and earned achievement badges.
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {badgesLoading ? '...' : (badges?.length ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Domain Tracks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {masteryLoading ? '...' : (mastery?.length ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Mastery XP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {masteryLoading
                ? '...'
                : (mastery ?? []).reduce((sum, track) => sum + (track.mastery_points ?? 0), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Domain Mastery Points</CardTitle>
              <Select
                disabled={preferenceLoading || updateFeaturedMastery.isPending || sortedMastery.length === 0}
                value={preference?.featured_department ?? 'auto'}
                onValueChange={(value) => {
                  const next = value === 'auto' ? null : value;
                  updateFeaturedMastery.mutate(next, {
                    onSuccess: () => {
                      addToast({
                        title: 'Leaderboard mastery updated',
                        description: next
                          ? `Featured mastery set to ${next}.`
                          : 'Leaderboard will use your highest mastery domain.',
                        variant: 'success',
                      });
                    },
                    onError: (error) => {
                      addToast({
                        title: 'Could not update mastery preference',
                        description: error instanceof Error ? error.message : 'Unknown error',
                        variant: 'error',
                      });
                    },
                  });
                }}
              >
                <SelectTrigger className="w-full sm:w-[260px]">
                  <SelectValue placeholder="Choose leaderboard mastery" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (highest mastery)</SelectItem>
                  {sortedMastery.map((track) => (
                    <SelectItem key={track.department} value={track.department}>
                      {track.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Hint: Choose a domain to feature on the leaderboard, or keep Auto to always show your highest mastery.
            </p>
          </CardHeader>
          <CardContent>
            {masteryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : sortedMastery.length > 0 ? (
              <div className="space-y-2">
                {sortedMastery.map((track) => (
                  <MasteryTrackCard
                    key={track.department}
                    department={track.department}
                    masteryPoints={track.mastery_points}
                    masteryLevel={track.mastery_level}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No mastery tracks yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            {badgesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : badges && badges.length > 0 ? (
              <div className="space-y-3">
                {badges.map((badge) => {
                  const def = badge.badge_definitions;
                  if (!def) return null;

                  return (
                    <div
                      key={badge.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border px-3 py-2 transition-shadow',
                        getBadgeRowTone(def.department, def.rarity),
                        getRarityContainerClasses(def.rarity)
                      )}
                    >
                      <BadgeIcon
                        id={def.id}
                        name={def.name}
                        description={def.description}
                        icon={def.icon}
                        department={def.department}
                        rarity={def.rarity}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{def.name}</p>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              getRarityTagClasses(def.rarity)
                            )}
                          >
                            {RARITY_LABEL[def.rarity]}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{def.description}</p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          Earned {new Date(badge.earned_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No badges earned yet.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
