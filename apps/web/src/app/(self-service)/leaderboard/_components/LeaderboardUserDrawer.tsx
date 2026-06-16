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
import { useWeeklyCommitment, type WeeklyCommitment } from '@/hooks/useWeeklyCommitments';

interface LeaderboardUserDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  department?: string | null;
}

export function LeaderboardUserDrawer({ open, onOpenChange, userId, fullName, avatarUrl, department }: LeaderboardUserDrawerProps) {
  // Fetch the weekly commitment for the provided userId (admin) or the current user when the drawer opens
  const { data } = useWeeklyCommitment(userId ?? null, { enabled: Boolean(open) });

  function isCompletedStatus(status?: string | null) {
    const s = (status ?? '').toLowerCase();
    return s === 'completed' || s === 'approved' || s === 'done';
  }

  const items = (data as WeeklyCommitment | null)?.items ?? [];
  const pct = items.length > 0 ? `${Math.round((items.filter((i) => isCompletedStatus(i.status)).length / items.length) * 100)}%` : '—';

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
                  {(data as WeeklyCommitment | null)?.items?.length ? (
                    (data as WeeklyCommitment).items.map((m) => (
                      <div key={m.id} className="rounded border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{m.title}</div>
                            <div className="text-xs text-zinc-500">{m.project_name}</div>
                          </div>
                          <div className="text-xs text-zinc-400">{m.progress_pct ?? 0}%</div>
                        </div>
                      </div>
                    ))
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
