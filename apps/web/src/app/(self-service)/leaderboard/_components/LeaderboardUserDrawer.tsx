'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidePanel,
  SlidePanelContent,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelBody,
  SlidePanelFooter,
  Avatar,
  Badge,
} from '@hr-portal/ui';
import { useWeeklyCommitments, type WeeklyCommitment } from '@/hooks/useWeeklyCommitments';

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

  function isCompletedStatus(status?: string | null) {
    const s = (status ?? '').toLowerCase();
    return s === 'completed' || s === 'approved' || s === 'done';
  }

  const commitments = (data as WeeklyCommitment[] | null) ?? [];
  const allItems = commitments.flatMap((commitment) => commitment.items ?? []);
  const pct =
    allItems.length > 0
      ? `${Math.round((allItems.filter((item) => isCompletedStatus(item.status)).length / allItems.length) * 100)}%`
      : '—';

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange}>
      <SlidePanelContent size="lg">
        <AnimatePresence initial={false} mode="wait">
          {open && (
            <motion.div
              key="drawer-motion"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
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

              <SlidePanelBody>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Top Weekly Milestones</h3>
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
                </div>
              </SlidePanelBody>

              <SlidePanelFooter>
                <div className="flex gap-2">
                  <button className="text-sm text-zinc-500" onClick={() => onOpenChange(false)} type="button">
                    Close
                  </button>
                </div>
              </SlidePanelFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </SlidePanelContent>
    </SlidePanel>
  );
}
