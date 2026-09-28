'use client';

import React from 'react';
import {
  cn,
  SlidePanel,
  SlidePanelContent,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelBody,
  SlidePanelFooter,
  Avatar,
  Badge,
  BadgeIcon,
  MasteryTrackCard,
  RARITY_LABEL,
  getBadgeRowTone,
  getRarityContainerClasses,
  getRarityTagClasses,
} from '@hr-portal/ui';
import { useWeeklyCommitments, type WeeklyCommitment } from '@/hooks/useWeeklyCommitments';
import { useUserMastery, useUserBadges } from '@/hooks/useGamification';

interface LeaderboardUserDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  department?: string | null;
}

export function LeaderboardUserDrawer({ open, onOpenChange, userId, fullName, avatarUrl, department }: LeaderboardUserDrawerProps) {
  // Fetch all weekly commitments for the provided userId (admin) or the current user when the drawer opens.
  const { data } = useWeeklyCommitments(userId ?? null, { enabled: Boolean(open) });
  const { data: masteryTracks } = useUserMastery(open ? userId : null);
  const { data: badges } = useUserBadges(open ? userId : null);

  function isCompletedStatus(status?: string | null) {
    const s = (status ?? '').toLowerCase();
    return s === 'completed' || s === 'approved' || s === 'done';
  }

  const commitments = (data as WeeklyCommitment[] | null) ?? [];
  const sortedMasteryTracks = [...(masteryTracks ?? [])].sort((a, b) => {
    if (b.mastery_level !== a.mastery_level) return b.mastery_level - a.mastery_level;
    if (b.mastery_points !== a.mastery_points) return b.mastery_points - a.mastery_points;
    return a.department.localeCompare(b.department);
  });
  const allItems = commitments.flatMap((commitment) => commitment.items ?? []);
  const pct =
    allItems.length > 0
      ? `${Math.round((allItems.filter((item) => isCompletedStatus(item.status)).length / allItems.length) * 100)}%`
      : '—';

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange}>
      <SlidePanelContent size="lg">
        <div className="flex h-full min-h-0 flex-col">
          <SlidePanelHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {avatarUrl ? <img src={avatarUrl} alt={fullName ?? ''} /> : null}
              </Avatar>
              <div>
                <SlidePanelTitle>{fullName ?? 'Unknown'}</SlidePanelTitle>
                <div className="mt-1 flex items-center gap-2">
                  {department ? <Badge variant="navy">{department}</Badge> : null}
                  <div className="text-indigo-600 font-semibold">{pct}</div>
                </div>
              </div>
            </div>
          </SlidePanelHeader>

          <SlidePanelBody className="min-h-0 flex-1">
            <div className="space-y-6">
                  {/* ── Weekly Commitments ───────────────────────────────── */}
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Top Weekly Milestones
                    </h3>
                  {commitments.length > 0 ? (
                    commitments.map((commitment) => {
                      const projectLabel =
                        commitment.project_name ?? commitment.items[0]?.project_name ?? 'Unknown project';

                      return (
                        <div key={commitment.id} className="rounded border p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm font-semibold">{projectLabel}</div>
                            <Badge variant="secondary">{commitment.items.length} item(s)</Badge>
                          </div>
                          <div className="space-y-2">
                            {commitment.items.map((milestone) => (
                              <div key={milestone.id} className="flex items-center justify-between rounded bg-zinc-50 px-2 py-1.5">
                                <div>
                                  <div className="font-medium">{milestone.title}</div>
                                  <div className="text-xs text-zinc-500">Slot {milestone.slot_order ?? '-'}</div>
                                </div>
                                <div className="text-xs text-zinc-400">{milestone.progress_pct ?? 0}%</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-zinc-500">No weekly commitments found.</p>
                  )}
                  </section>

                  {/* ── Domain Mastery ───────────────────────────────────── */}
                  {sortedMasteryTracks.length > 0 ? (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Mastery Tracks
                      </h3>
                      <div className="space-y-2">
                        {sortedMasteryTracks.map((track) => (
                          <MasteryTrackCard
                            key={track.department}
                            department={track.department}
                            masteryPoints={track.mastery_points}
                            masteryLevel={track.mastery_level}
                          />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {/* ── Achievements / Badges ────────────────────────────── */}
                  {badges && badges.length > 0 ? (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Achievements
                      </h3>
                      <div className="space-y-2">
                        {badges.map((b) => {
                          const def = b.badge_definitions;
                          if (!def) return null;
                          return (
                            <div
                              key={b.id}
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
                                  Earned {new Date(b.earned_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  

            </div>
          </SlidePanelBody>

          <SlidePanelFooter>
            <div className="flex gap-2">
              <button className="text-sm text-zinc-500" onClick={() => onOpenChange(false)} type="button">
                Close
              </button>
            </div>
          </SlidePanelFooter>
        </div>
      </SlidePanelContent>
    </SlidePanel>
  );
}
