'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useProjects, type ProjectHealth, type ProjectStatus } from '@/hooks/useProjects';
import {
  Button,
  EmptyState,
  ProjectCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@hr-portal/ui';
import { FolderKanban, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

export default function ProjectsListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [status, setStatus] = useState<ProjectStatus | 'all'>('all');
  const [health, setHealth] = useState<ProjectHealth | 'all'>('all');
  const [mineOnly, setMineOnly] = useState<boolean>(!isAdmin);

  const filters = useMemo(() => {
    const f: Parameters<typeof useProjects>[0] = { pageSize: 50 };
    if (status !== 'all') f.status = status;
    if (health !== 'all') f.health = health;
    if (mineOnly) f.mineOnly = true;
    return f;
  }, [status, health, mineOnly]);

  const { data, isLoading } = useProjects(filters);
  const projects = data?.data ?? [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Projects
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Track your monthly milestones and earn points
          </p>
        </div>
        <Button onClick={() => router.push('/projects/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </header>

      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
        <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={health} onValueChange={(v) => setHealth(v as ProjectHealth | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Health" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All health</SelectItem>
            <SelectItem value="on_track">On track</SelectItem>
            <SelectItem value="at_risk">At risk</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin ? (
          <Button
            variant={mineOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMineOnly((v) => !v)}
          >
            Mine only
          </Button>
        ) : null}
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-10 w-10" />}
            title="No projects yet"
            description="Start tracking your work by creating your first project."
            action={{
              label: 'New Project',
              onClick: () => router.push('/projects/new'),
              icon: <Plus className="h-4 w-4" />,
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <ProjectCard
                  name={p.name}
                  description={p.description}
                  progressPct={p.progress_pct}
                  health={p.health}
                  pointsTotal={p.points_total}
                  targetEndDate={p.target_end_date}
                />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
