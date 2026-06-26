'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Label,
  Progress,
} from '@hr-portal/ui';
import { useCreateCommitment, type MilestoneItem } from '@/hooks/useWeeklyCommitments';

interface MondayCommitmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableMilestones?: MilestoneItem[]; // optional list seeded from parent
}

function getIsoWeekAndYear(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // ISO week date weeks start on Monday, so correct the day number
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { iso_week: weekNo, iso_year: date.getUTCFullYear() };
}

export function MondayCommitmentModal({ open, onOpenChange, availableMilestones = [] }: MondayCommitmentModalProps) {
  const [pickedSlots, setPickedSlots] = useState<Array<MilestoneItem | null>>([null, null, null, null, null]);
  const createCommitment = useCreateCommitment();

  const filledCount = pickedSlots.filter(Boolean).length;

  const handlePick = (milestone: MilestoneItem) => {
    // don't add duplicates
    if (pickedSlots.some((s) => s && s.milestone_id === milestone.milestone_id)) return;
    const idx = pickedSlots.findIndex((s) => s === null);
    if (idx === -1) return; // max 5
    const next = [...pickedSlots];
    next[idx] = { ...milestone, slot_order: idx + 1 };
    setPickedSlots(next);
  };

  const handleRemove = (index: number) => {
    const next = [...pickedSlots];
    next[index] = null;
    setPickedSlots(next);
  };

  const handleLock = async () => {
    const { iso_week, iso_year } = getIsoWeekAndYear();
    const items = pickedSlots
      .map((s, i) => (s && s.milestone_id ? { milestone_id: s.milestone_id, slot_order: i + 1 } : null))
      .filter(Boolean) as { milestone_id: string; slot_order: number }[];
    createCommitment.mutate({ iso_week, iso_year, items } as any, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Lock Weekly Commitments</DialogTitle>
          <DialogDescription>Select 3–5 milestones for this week's focus.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 h-[60vh]">
          <div className="overflow-y-auto rounded border border-zinc-200 p-4">
            <Label>Available milestones</Label>
            <div className="mt-3 space-y-2">
              {availableMilestones.length === 0 ? (
                <p className="text-sm text-zinc-500">No active milestones found.</p>
              ) : (
                availableMilestones.map((m) => (
                  (() => {
                    const progressValue = Math.max(0, Math.min(100, m.progress_pct ?? 0));

                    return (
                  <button
                    key={m.milestone_id}
                    onClick={() => handlePick(m)}
                    className="w-full rounded border px-3 py-2 text-left hover:bg-zinc-50"
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{m.title}</div>
                        <div className="text-xs text-zinc-500">{m.project_name}</div>
                        <div className="mt-2 space-y-1">
                          <Progress value={progressValue} className="h-1.5" />
                          <div className="text-[11px] text-zinc-400">{progressValue}% complete</div>
                        </div>
                      </div>
                    </div>
                  </button>
                    );
                  })()
                ))
              )}
            </div>
          </div>

          <div className="rounded border border-zinc-200 p-4 flex flex-col">
            <Label>Weekly Focus Slots</Label>
            <div className="mt-3 grid gap-2">
              {pickedSlots.map((slot, idx) => (
                <div key={idx} className="flex items-center justify-between rounded bg-zinc-50 p-3">
                  <div>
                    <div className="text-sm font-medium">Slot {idx + 1}{idx === 0 ? ': Primary Focus' : ''}</div>
                    <div className="text-xs text-zinc-500">{slot ? slot.title : 'Empty'}</div>
                  </div>
                  <div>
                    {slot ? (
                      <button className="text-sm text-rose-600" onClick={() => handleRemove(idx)} type="button">
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto">
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void handleLock()} disabled={filledCount < 1 || (createCommitment as any).isLoading}>
                  {(createCommitment as any).isLoading ? 'Saving...' : 'Lock in Weekly Focus'}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
