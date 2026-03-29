'use client';

import { type OffboardingTaskRecord, useOffboarding } from '@/hooks/useOffboarding';
import { useMemo } from 'react';

export interface OffboardingChecklistItemSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  isCompleted: boolean;
  dueLabel?: string;
  ownerLabel: string;
  canComplete: boolean;
  source: 'checklist';
}

function formatDueLabel(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return `Due ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

function toChecklistItem(task: OffboardingTaskRecord): OffboardingChecklistItemSummary {
  const checklistItem: OffboardingChecklistItemSummary = {
    id: task.id,
    title: task.title,
    description: task.description ?? 'No description provided.',
    category: task.category,
    isCompleted: task.is_completed,
    ownerLabel: task.owner_label,
    canComplete: task.can_complete,
    source: 'checklist',
  };

  const dueLabel = formatDueLabel(task.due_date);
  if (dueLabel) {
    checklistItem.dueLabel = dueLabel;
  }

  return checklistItem;
}

export function useOffboardingSummary() {
  const offboardingQuery = useOffboarding();

  const summary = useMemo(() => {
    const record = offboardingQuery.data?.data?.[0] ?? null;
    const checklistTasks = record?.offboarding_tasks ?? [];
    const checklistItems = checklistTasks.map(toChecklistItem);

    const completedRequirements = checklistItems.filter((item) => item.isCompleted).length;
    const totalRequirements = checklistItems.length;
    const progressPercent =
      totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : 0;
    const tasksRemainingCount = checklistItems.filter((item) => !item.isCompleted).length;
    const employeeActionCount = checklistItems.filter(
      (item) => !item.isCompleted && item.ownerLabel === 'Employee action'
    ).length;
    const internalActionCount = checklistItems.filter(
      (item) => !item.isCompleted && item.ownerLabel === 'Internal action'
    ).length;

    return {
      offboarding: record,
      checklistTasks,
      checklistItems,
      completedRequirements,
      totalRequirements,
      progressPercent,
      tasksRemainingCount,
      employeeActionCount,
      internalActionCount,
    };
  }, [offboardingQuery.data?.data]);

  return {
    ...summary,
    isLoading: offboardingQuery.isLoading,
    isError: offboardingQuery.isError,
    refetchOffboarding: offboardingQuery.refetch,
  };
}