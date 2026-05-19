'use client';

import { useProjectPool, type BacklogPriority, type ProjectBacklogItem } from '@/hooks/useProjectPool';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
} from '@hr-portal/ui';
import { ArrowLeft, Inbox } from 'lucide-react';
import { useRouter } from 'next/navigation';

const PRIORITY_TONE: Record<BacklogPriority, 'secondary' | 'default' | 'destructive'> = {
  Low: 'secondary',
  Medium: 'secondary',
  High: 'default',
  Urgent: 'destructive',
};

export default function AdminProjectPoolPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useProjectPool();

  const items: ProjectBacklogItem[] = data?.items ?? [];

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/war-room')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Project Pool
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Read-only backlog view for admin and super-admin. Interns claim from their workspace.
            </p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Skeleton key={item} className="h-56" />
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
