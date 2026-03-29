'use client';

import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { useOffboardingSummary } from '@/hooks/useOffboardingSummary';
import { useOnboardingProgressSummary } from '@/hooks/useOnboardingProgressSummary';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@hr-portal/ui';
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  ExternalLink,
  Loader2,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useMemo, useState } from 'react';

function formatCategoryLabel(category: string): string {
  return category
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (segment) => segment.toUpperCase());
}

export default function OnboardingPage(): ReactNode {
  const { addToast } = useToast();
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [togglingOffboardingTaskId, setTogglingOffboardingTaskId] = useState<string | null>(null);
  const {
    checklist,
    checklistTasks,
    checklistItems,
    wizardChecklistItem,
    completedRequirements,
    totalRequirements,
    progressPercent,
    tasksRemainingCount,
    isLoading,
    refetchChecklist,
  } = useOnboardingProgressSummary();
  const {
    offboarding,
    checklistItems: offboardingChecklistItems,
    checklistTasks: offboardingChecklistTasks,
    completedRequirements: completedOffboardingRequirements,
    totalRequirements: totalOffboardingRequirements,
    progressPercent: offboardingProgressPercent,
    tasksRemainingCount: offboardingTasksRemainingCount,
    employeeActionCount,
    internalActionCount,
    isLoading: isOffboardingLoading,
    isError: isOffboardingError,
    refetchOffboarding,
  } = useOffboardingSummary();

  const groupedChecklistItems = useMemo(() => {
    return checklistItems.reduce(
      (groups, item) => {
        const category = item.category;
        const existing = groups[category] ?? [];
        return {
          ...groups,
          [category]: [...existing, item],
        };
      },
      {} as Record<string, typeof checklistItems>
    );
  }, [checklistItems]);

  const categoryEntries = useMemo(
    () =>
      Object.entries(groupedChecklistItems).sort(([leftCategory], [rightCategory]) => {
        const categoryOrder = [
          'personal_information',
          'payment_information',
          'documents',
          'review',
        ];
        const leftIndex = categoryOrder.indexOf(leftCategory);
        const rightIndex = categoryOrder.indexOf(rightCategory);

        if (leftIndex !== -1 || rightIndex !== -1) {
          if (leftIndex === -1) return 1;
          if (rightIndex === -1) return -1;
          return leftIndex - rightIndex;
        }

        return leftCategory.localeCompare(rightCategory);
      }),
    [groupedChecklistItems]
  );

  const completedChecklistItems = checklistItems.filter((item) => item.isCompleted).length;
  const customTaskCount = checklistTasks.length;

  const taskById = useMemo(
    () => new Map(checklistTasks.map((task) => [task.id, task])),
    [checklistTasks]
  );
  const offboardingTaskById = useMemo(
    () => new Map(offboardingChecklistTasks.map((task) => [task.id, task])),
    [offboardingChecklistTasks]
  );
  const groupedOffboardingItems = useMemo(() => {
    return offboardingChecklistItems.reduce(
      (groups, item) => {
        const existing = groups[item.category] ?? [];
        return {
          ...groups,
          [item.category]: [...existing, item],
        };
      },
      {} as Record<string, typeof offboardingChecklistItems>
    );
  }, [offboardingChecklistItems]);
  const offboardingCategoryEntries = useMemo(
    () => Object.entries(groupedOffboardingItems).sort(([left], [right]) => left.localeCompare(right)),
    [groupedOffboardingItems]
  );

  const toggleTask = async (task: (typeof checklistTasks)[number]): Promise<void> => {
    if (!checklist?.id) return;
    setTogglingTaskId(task.id);
    try {
      const response = await fetch(`/api/onboarding/${checklist.id}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, isCompleted: !task.is_completed }),
      });
      if (!response.ok) throw new Error('Failed to update task');
      await refetchChecklist();
      addToast({
        title: task.is_completed ? 'Task marked as incomplete' : 'Task completed',
        variant: 'success',
      });
    } catch {
      addToast({ title: 'Failed to update task', variant: 'error' });
    } finally {
      setTogglingTaskId(null);
    }
  };

  const toggleOffboardingTask = async (taskId: string): Promise<void> => {
    if (!offboarding?.id) return;

    const task = offboardingTaskById.get(taskId);
    if (!task?.can_complete) {
      return;
    }

    setTogglingOffboardingTaskId(task.id);
    try {
      const response = await fetch(`/api/offboarding/${offboarding.id}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, isCompleted: !task.is_completed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update offboarding task');
      }

      await refetchOffboarding();
      addToast({
        title: task.is_completed ? 'Offboarding task marked as incomplete' : 'Offboarding task completed',
        variant: 'success',
      });
    } catch {
      addToast({ title: 'Failed to update offboarding task', variant: 'error' });
    } finally {
      setTogglingOffboardingTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Checklist Hub</h1>
        <p className="text-muted-foreground">
          Track exactly what you still need to complete for onboarding and, when applicable,
          offboarding.
        </p>
      </div>

      <Tabs defaultValue="onboarding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="offboarding">Offboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding" className="space-y-6">
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Progress</p>
                  <p className="text-2xl font-bold text-primary">{progressPercent}%</p>
                </div>
                {wizardChecklistItem.isCompleted && (
                  <Badge variant="success">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Form Submitted
                  </Badge>
                )}
              </div>
              <Progress value={progressPercent} className="h-3" />
              <p className="text-sm text-muted-foreground">
                {completedRequirements} of {totalRequirements} checklist items complete
              </p>
              <p className="text-sm text-muted-foreground">
                {tasksRemainingCount} checklist item{tasksRemainingCount === 1 ? '' : 's'} remaining
              </p>
            </CardContent>
          </Card>

          <StatCardGrid columns={4}>
            <StatCard
              label="Checklist Complete"
              value={`${completedRequirements}/${totalRequirements}`}
              icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Checklist Items Closed"
              value={`${completedChecklistItems}/${checklistItems.length}`}
              icon={<ClipboardList className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Custom Tasks"
              value={customTaskCount}
              icon={<ClipboardList className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Still Needs Action"
              value={tasksRemainingCount}
              icon={<Circle className="h-4 w-4" strokeWidth={1.5} />}
            />
          </StatCardGrid>

          <Card>
            <CardHeader>
              <CardTitle>Onboarding Checklist</CardTitle>
              <CardDescription>
                This page now treats onboarding form requirements, document uploads, review, and
                admin-assigned tasks as one checklist so the totals stay aligned.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <EmptyState
                  icon={<Loader2 className="h-5 w-5 animate-spin" />}
                  title="Loading onboarding tasks"
                  description="Fetching your current checklist and assigned actions."
                  size="sm"
                />
              ) : null}

              {!isLoading && checklistTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No additional admin checklist tasks have been assigned yet. Your onboarding form
                  requirements below are still tracked as real checklist items.
                </p>
              ) : null}

              {categoryEntries.map(([category, items]) => (
                <Card key={category} className="border border-zinc-200 dark:border-zinc-800 shadow-none">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{formatCategoryLabel(category)}</CardTitle>
                        <CardDescription>
                          {items.filter((item) => item.isCompleted).length} of {items.length} item
                          {items.length === 1 ? '' : 's'} completed
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {items.filter((item) => !item.isCompleted).length} open
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {items.map((item) => {
                      const task = taskById.get(item.id);

                      return (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-4 rounded-md border border-zinc-200 dark:border-zinc-800 p-3"
                        >
                          <div className="flex items-start gap-3">
                            {item.isCompleted ? (
                              <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                            ) : (
                              <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <p
                                className={`font-medium ${item.isCompleted ? 'line-through text-muted-foreground' : ''}`}
                              >
                                {item.title}
                              </p>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                              {item.submissionDescription ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {item.submissionDescription}
                                </p>
                              ) : null}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{formatCategoryLabel(item.category)}</Badge>
                                {item.isRequired ? <Badge variant="outline">Required</Badge> : null}
                                {item.progressLabel ? <Badge variant="outline">{item.progressLabel}</Badge> : null}
                                {item.dueLabel ? <Badge variant="outline">{item.dueLabel}</Badge> : null}
                                {item.submissionRequirementLabel ? (
                                  <Badge variant="outline">{item.submissionRequirementLabel}</Badge>
                                ) : null}
                              </div>
                              {item.referenceUrl ? (
                                <a
                                  href={item.referenceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                                >
                                  Open reference
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                          {item.source === 'wizard' && item.actionHref ? (
                            <Button asChild variant="outline" size="sm">
                              <Link href={item.actionHref}>
                                {item.actionLabel ?? 'Open'}
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </Link>
                            </Button>
                          ) : task ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void toggleTask(task)}
                              disabled={togglingTaskId === task.id}
                            >
                              {togglingTaskId === task.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : null}
                              {task.is_completed ? 'Undo' : 'Mark Done'}
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offboarding" className="space-y-6">
          {isOffboardingLoading && !offboarding ? (
            <Card>
              <CardHeader>
                <CardTitle>Offboarding Checklist</CardTitle>
                <CardDescription>Checking whether an offboarding workflow is active for you.</CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={<Loader2 className="h-5 w-5 animate-spin" />}
                  title="Loading offboarding workflow"
                  description="Checking for active offboarding records and assigned exit tasks."
                  size="sm"
                />
              </CardContent>
            </Card>
          ) : isOffboardingError && !offboarding ? (
            <Card>
              <CardHeader>
                <CardTitle>Offboarding Checklist</CardTitle>
                <CardDescription>We could not load your offboarding workflow.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive">Try refreshing the page or check again later.</p>
              </CardContent>
            </Card>
          ) : offboarding ? (
            <>
              <Card className="bg-gradient-to-r from-amber-50 via-white to-rose-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950">
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Offboarding Progress</p>
                      <p className="text-2xl font-bold text-foreground">{offboardingProgressPercent}%</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={offboarding.status === 'completed' ? 'success' : 'warning'}>
                        {formatCategoryLabel(offboarding.status)}
                      </Badge>
                      <Badge variant="outline">{formatCategoryLabel(offboarding.exit_type)}</Badge>
                    </div>
                  </div>
                  <Progress value={offboardingProgressPercent} className="h-3" />
                  <p className="text-sm text-muted-foreground">
                    {completedOffboardingRequirements} of {totalOffboardingRequirements} checklist items complete
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last working day: {new Date(offboarding.last_working_day).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </CardContent>
              </Card>

              <StatCardGrid columns={4}>
                <StatCard
                  label="Checklist Complete"
                  value={`${completedOffboardingRequirements}/${totalOffboardingRequirements}`}
                  icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
                />
                <StatCard
                  label="My Actions Open"
                  value={employeeActionCount}
                  icon={<ClipboardList className="h-4 w-4" strokeWidth={1.5} />}
                />
                <StatCard
                  label="Internal Actions Open"
                  value={internalActionCount}
                  icon={<LogOut className="h-4 w-4" strokeWidth={1.5} />}
                />
                <StatCard
                  label="Still Needs Action"
                  value={offboardingTasksRemainingCount}
                  icon={<Circle className="h-4 w-4" strokeWidth={1.5} />}
                />
              </StatCardGrid>

              <Card>
                <CardHeader>
                  <CardTitle>Offboarding Checklist</CardTitle>
                  <CardDescription>
                    This checklist shows which exit steps are yours to complete and which ones are handled internally by HR or other teams.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isOffboardingLoading ? (
                    <EmptyState
                      icon={<Loader2 className="h-5 w-5 animate-spin" />}
                      title="Loading offboarding tasks"
                      description="Refreshing your assigned exit requirements."
                      size="sm"
                    />
                  ) : null}

                  {offboardingCategoryEntries.map(([category, items]) => (
                    <Card key={category} className="border border-zinc-200 dark:border-zinc-800 shadow-none">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">{formatCategoryLabel(category)}</CardTitle>
                            <CardDescription>
                              {items.filter((item) => item.isCompleted).length} of {items.length} item{items.length === 1 ? '' : 's'} completed
                            </CardDescription>
                          </div>
                          <Badge variant="outline">
                            {items.filter((item) => !item.isCompleted).length} open
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {items.map((item) => {
                          const task = offboardingTaskById.get(item.id);

                          return (
                            <div
                              key={item.id}
                              className="flex items-start justify-between gap-4 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                            >
                              <div className="flex items-start gap-3">
                                {item.isCompleted ? (
                                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                                ) : (
                                  <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />
                                )}
                                <div>
                                  <p className={`font-medium ${item.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                    {item.title}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{item.description}</p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary">{formatCategoryLabel(item.category)}</Badge>
                                    <Badge variant={item.ownerLabel === 'Employee action' ? 'outline' : 'secondary'}>
                                      {item.ownerLabel}
                                    </Badge>
                                    {item.dueLabel ? <Badge variant="outline">{item.dueLabel}</Badge> : null}
                                  </div>
                                </div>
                              </div>
                              {task?.can_complete ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void toggleOffboardingTask(task.id)}
                                  disabled={togglingOffboardingTaskId === task.id}
                                >
                                  {togglingOffboardingTaskId === task.id ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : null}
                                  {task.is_completed ? 'Undo' : 'Mark Done'}
                                </Button>
                              ) : (
                                <Badge variant="outline">Internal owner</Badge>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Offboarding Checklist</CardTitle>
                <CardDescription>
                  When an exit workflow is started for you, your assigned offboarding tasks and the
                  internal owner actions will appear here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={LogOut}
                  title="No offboarding checklist"
                  description="You do not have an active offboarding process right now. If one is initiated, this tab will show the exact steps assigned to you and the internal teams handling the rest."
                  action={{ label: 'Review onboarding form', href: '/onboarding/setup' }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
