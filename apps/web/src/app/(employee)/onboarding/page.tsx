'use client';

import { queryKeys } from '@/lib/query-keys';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  useToast,
} from '@hr-portal/ui';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

interface OnboardingTask {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_completed: boolean;
}

interface OnboardingChecklist {
  id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  onboarding_tasks: Array<OnboardingTask>;
}

export default function OnboardingPage(): ReactNode {
  const { addToast } = useToast();
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const onboardingQuery = useQuery({
    queryKey: queryKeys.onboarding.tasks(),
    queryFn: async (): Promise<{ data: Array<OnboardingChecklist> }> => {
      const response = await fetch('/api/onboarding');
      if (!response.ok) {
        throw new Error('Failed to fetch onboarding tasks');
      }
      return response.json();
    },
  });

  const checklist = onboardingQuery.data?.data?.[0];
  const tasks = checklist?.onboarding_tasks ?? [];

  const { completedCount, progress } = useMemo(() => {
    const completed = tasks.filter((item) => item.is_completed).length;
    const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return { completedCount: completed, progress: pct };
  }, [tasks]);

  const toggleTask = async (task: OnboardingTask): Promise<void> => {
    if (!checklist?.id) return;
    setTogglingTaskId(task.id);
    try {
      const response = await fetch(`/api/onboarding/${checklist.id}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, isCompleted: !task.is_completed }),
      });
      if (!response.ok) throw new Error('Failed to update task');
      await onboardingQuery.refetch();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Onboarding</h1>
        <p className="text-muted-foreground">Track and complete your onboarding checklist.</p>
      </div>

      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Overall Progress</p>
              <p className="text-2xl font-bold text-primary">{progress}%</p>
            </div>
            {progress === 100 && (
              <Badge variant="success">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Completed
              </Badge>
            )}
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-muted-foreground">
            {completedCount} of {tasks.length} tasks completed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
          <CardDescription>Finish all required onboarding tasks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {onboardingQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          )}
          {!onboardingQuery.isLoading && tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">No onboarding checklist assigned yet.</p>
          )}
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start justify-between gap-4 rounded-md border border-zinc-200 dark:border-zinc-800 p-3"
            >
              <div className="flex items-start gap-3">
                {task.is_completed ? (
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                )}
                <div>
                  <p
                    className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  )}
                  <Badge variant="secondary" className="mt-2">
                    {task.category}
                  </Badge>
                </div>
              </div>
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
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
