'use client';

import React from 'react';
import { Badge } from '@hr-portal/ui';
import { useMyWeeklyCommitments } from '@/hooks/useWeeklyCommitments';
import type { WeeklyCommitment, MilestoneItem } from '@/hooks/useWeeklyCommitments';
import { formatLabel } from '@/lib/format';

function isCompletedStatus(item: MilestoneItem) {
  const s = (item.status ?? '').toString().toLowerCase();
  if (s === 'completed' || s === 'approved' || s === 'done') return true;
  if (typeof item.progress_pct === 'number' && item.progress_pct >= 100) return true;
  return false;
}

export function WeeklyFocusCard({ projectId }: { projectId?: string }) {
  const { data, isLoading } = useMyWeeklyCommitments({ projectId: projectId ?? null });

  if (isLoading) return null;
  const commitments: WeeklyCommitment[] = data ?? [];
  if (commitments.length === 0) return null;

  const totalItems = commitments.reduce(
    (sum, commitment) => sum + commitment.items.length,
    0
  );
  const completedItems = commitments.reduce(
    (sum, commitment) =>
      sum + commitment.items.filter((item) => isCompletedStatus(item)).length,
    0
  );

  return (
    <div className="rounded-md border border-indigo-100 bg-indigo-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Weekly Focus</h3>
        <div className="text-sm font-semibold text-indigo-600">
          {completedItems} of {totalItems} completed
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {(commitments as WeeklyCommitment[]).map((commitment) => {
          const completed = commitment.items.filter((item) => isCompletedStatus(item)).length;
          const projectLabel = commitment.project_name ?? commitment.items[0]?.project_name ?? 'Unknown project';

          return (
            <div key={commitment.id} className="rounded-md border border-indigo-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-zinc-900">{projectLabel}</div>
                <div className="text-xs font-medium text-indigo-600">
                  {completed}/{commitment.items.length} done
                </div>
              </div>
              <div className="grid gap-2">
                {commitment.items.map((item) => {
                  const done = isCompletedStatus(item);
                  const label = item.status
                    ? formatLabel(item.status)
                    : done
                      ? 'Completed'
                      : 'In Progress';

                  return (
                    <div key={item.id} className="flex items-center justify-between rounded bg-zinc-50 p-2">
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-zinc-500">{item.progress_pct ?? 0}%</div>
                      </div>
                      <Badge variant={done ? 'success' : 'pending'}>{label}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
