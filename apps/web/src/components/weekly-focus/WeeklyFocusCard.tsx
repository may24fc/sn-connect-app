'use client';

import React from 'react';
import { Badge } from '@hr-portal/ui';
import { useMyWeeklyCommitment } from '@/hooks/useWeeklyCommitments';
import type { WeeklyCommitment, MilestoneItem } from '@/hooks/useWeeklyCommitments';
import { formatLabel } from '@/lib/format';

function isCompletedStatus(item: MilestoneItem) {
  const s = (item.status ?? '').toString().toLowerCase();
  if (s === 'completed' || s === 'approved' || s === 'done') return true;
  if (typeof item.progress_pct === 'number' && item.progress_pct >= 100) return true;
  return false;
}

export function WeeklyFocusCard() {
  const { data, isLoading } = useMyWeeklyCommitment();

  if (isLoading) return null;
  if (!data) return null;

  const commitment = data as WeeklyCommitment;
  const completed = commitment.items.filter((i) => isCompletedStatus(i)).length;

  return (
    <div className="rounded-md border border-indigo-100 bg-indigo-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">🎯 Weekly Focus</h3>
        <div className="text-sm text-indigo-600 font-semibold">{completed} of {commitment.items.length} completed</div>
      </div>

      <div className="mt-3 grid gap-2">
        {commitment.items.map((m) => {
          const done = isCompletedStatus(m);
          const label = m.status ? formatLabel(m.status) : done ? 'Completed' : 'In Progress';
          return (
            <div key={m.id} className="flex items-center justify-between rounded bg-white p-3 shadow-sm">
              <div>
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-zinc-500">{m.project_name}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={done ? 'success' : 'pending'}>{label}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
