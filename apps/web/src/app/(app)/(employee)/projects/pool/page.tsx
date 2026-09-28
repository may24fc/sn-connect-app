'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  useToast,
} from '@hr-portal/ui';
import {
  useClaimProject,
  useProjectPool,
  type BacklogPriority,
  type ProjectBacklogItem,
} from '@/hooks/useProjectPool';

const PRIORITY_TONE: Record<BacklogPriority, 'secondary' | 'default' | 'destructive'> = {
  Low: 'secondary',
  Medium: 'secondary',
  High: 'default',
  Urgent: 'destructive',
};

export default function ProjectPoolPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useProjectPool();
  const { addToast } = useToast();
  const claim = useClaimProject();

  const items: ProjectBacklogItem[] = data?.items ?? [];

  async function handleClaim(item: ProjectBacklogItem) {
    try {
      const result = await claim.mutateAsync(item.id);
      addToast({ title: `You claimed "${item.title}"`, variant: 'success' });
      router.push(`/projects/${result.projectId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addToast({
        title: 'Could not claim project',
        description: message === 'Already claimed' ? 'Someone else got there first.' : message,
        variant: 'error',
      });
      if (message === 'Already claimed') {
        await refetch();
      }
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Project Pool
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Unclaimed projects from leadership. Pick to make it yours.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={Inbox}
            title="Could not load the project pool"
            description="Refresh the page or try again in a moment."
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Pool is empty"
            description="When the CEO sends a new project request via Telegram, it will appear here."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                    <Badge variant={PRIORITY_TONE[item.priority]}>{item.priority}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3 text-sm">
                  <p className="text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">Problem: </span>
                    {item.problem_statement}
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">Objective: </span>
                    {item.objective}
                  </p>
                  {item.technical_scope.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.technical_scope.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {item.target_departments.length > 0 ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      For: {item.target_departments.join(', ')}
                    </p>
                  ) : null}
                  <div className="mt-auto pt-2">
                    <Button
                      className="w-full"
                      onClick={() => handleClaim(item)}
                      disabled={claim.isPending}
                    >
                      {claim.isPending && claim.variables === item.id ? 'Claiming…' : 'Accept project'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
