'use client';

import { useOnboardingProgressSummary } from '@/hooks/useOnboardingProgressSummary';
import { useTasks } from '@/hooks/useTasks';
import { useEvaluationCadence } from '@/hooks/useEvaluationCadence';
import { useAuth } from '@/contexts/AuthContext';
import type { DashboardAttentionItem } from '@hr-portal/ui';
import { ClipboardCheck, ClipboardList, Target } from 'lucide-react';

export function useEmployeeDashboardAttentionItems() {
  const { user } = useAuth();
  const isEvaluationAudience = user?.role === 'employee' || user?.role === 'associate';

  const {
    profile: onboardingProfile,
    progressPercent: onboardingProgress,
    tasksRemainingCount,
    isLoading: isOnboardingLoading,
  } = useOnboardingProgressSummary();

  const { data: tasksResponse, isLoading: isTasksLoading } = useTasks(
    {
      ...(user?.id ? { assigneeId: user.id } : {}),
      page: 1,
      pageSize: 100,
    },
    { enabled: Boolean(user?.id) }
  );

  const { data: evaluationCadence, isLoading: isEvaluationLoading } = useEvaluationCadence(
    isEvaluationAudience
  );

  const items: DashboardAttentionItem[] = [];

  const isOnboardingCompleted = onboardingProfile?.is_completed === true;

  // Incomplete onboarding — prompt user to complete
  if (!isOnboardingCompleted && !isOnboardingLoading) {
    const hasStarted = onboardingProfile !== null;
    items.push({
      id: 'onboarding-incomplete',
      title: hasStarted ? 'Continue Onboarding' : 'Complete Your Onboarding',
      description: hasStarted
        ? `Your onboarding is ${onboardingProgress}% complete. Pick up where you left off.`
        : 'Set up your profile, payment info, and required documents to get started.',
      count: tasksRemainingCount,
      href: '/onboarding/setup',
      icon: ClipboardList,
      severity: 'warning',
      actionLabel: hasStarted ? 'Continue setup' : 'Start setup',
    });
  }

  // Overdue / pending tasks
  const assignedTasks = tasksResponse?.data || [];
  const pendingTaskCount = assignedTasks.filter((t) => t.status !== 'completed').length;
  if (pendingTaskCount > 0 && !isTasksLoading) {
    items.push({
      id: 'pending-tasks',
      title: 'Pending Tasks',
      description: `You have ${pendingTaskCount} task${pendingTaskCount === 1 ? '' : 's'} that need${pendingTaskCount === 1 ? 's' : ''} your attention.`,
      count: pendingTaskCount,
      href: '/tasks',
      icon: ClipboardCheck,
      severity: pendingTaskCount > 5 ? 'critical' : 'info',
      actionLabel: 'View tasks',
    });
  }

  const evaluationPrompts = evaluationCadence?.prompts ?? [];
  for (const prompt of evaluationPrompts) {
    items.push({
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      count: prompt.count,
      href: prompt.href,
      icon: prompt.kind === 'quarterly' ? Target : ClipboardCheck,
      severity: prompt.severity,
      ...(prompt.meta ? { meta: prompt.meta } : {}),
      actionLabel: prompt.actionLabel,
    });
  }

  return {
    items,
    totalCount: items.length,
    isLoading: isOnboardingLoading || isTasksLoading || isEvaluationLoading,
  };
}
