'use client';

import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { ProjectDescriptionFields } from '@/components/projects/ProjectDescriptionFields';
import { useAuth } from '@/contexts/AuthContext';
import {
  type ProjectHealth,
  type ProjectRecord,
  type ProjectStatus,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from '@/hooks/useProjects';
import { useProjectPoolCount } from '@/hooks/useProjectPool';
import {
  type ProjectDescriptionSections,
  composeProjectDescription,
  parseProjectDescription,
} from '@/lib/projects/descriptionSections';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  ProjectCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  useToast,
} from '@hr-portal/ui';
import { FolderKanban, Inbox, Plus, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, type FormEvent, useEffect } from 'react';
import { WeeklyFocusCard } from '@/components/weekly-focus/WeeklyFocusCard';

export default function ProjectsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const leadUserIdFilter = searchParams.get('leadUserId') || undefined;

  const [status, setStatus] = useState<ProjectStatus | 'all'>('all');
  const [health, setHealth] = useState<ProjectHealth | 'all'>('all');
  const [mineOnly, setMineOnly] = useState<boolean>(!isAdmin);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectRecord | null>(null);


  const deleteProject = useDeleteProject();

  const filters = useMemo(() => {
    const f: Parameters<typeof useProjects>[0] = { pageSize: 50 };
    if (status !== 'all') f.status = status;
    if (health !== 'all') f.health = health;
    if (leadUserIdFilter) f.leadUserId = leadUserIdFilter;
    if (mineOnly) f.mineOnly = true;
    return f;
  }, [status, health, leadUserIdFilter, mineOnly]);

  const { data, isLoading } = useProjects(filters);
  const projects = data?.data ?? [];
  const { data: poolCountData } = useProjectPoolCount();
  const poolCount = poolCountData?.count ?? 0;

  async function handleDeleteProject() {
    if (!deletingProject) return;
    try {
      await deleteProject.mutateAsync({ projectId: deletingProject.id });
      setDeletingProject(null);
      addToast({ title: 'Project deleted', variant: 'success' });
    } catch (err) {
      addToast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/projects/pool')}>
            <Inbox className="mr-2 h-4 w-4" />
            Project Pool
            {poolCount > 0 ? (
              <Badge variant="secondary" className="ml-2">
                {poolCount}
              </Badge>
            ) : null}
          </Button>
          <Button variant="outline" onClick={() => router.push('/leaderboard/achievements')}>
            <Trophy className="mr-2 h-4 w-4" />
            Achievements
          </Button>
          <Button onClick={() => router.push('/projects/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
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
        {/* Weekly Focus card anchored at the top of the Projects page */}
        <div className="mb-6">
          <WeeklyFocusCard />
        </div>

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
            {projects.map((p) => {
              const canEdit = isAdmin || p.lead_user_id === user?.id;
              return (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <ProjectCard
                    name={p.name}
                    description={p.description}
                    progressPct={p.progress_pct}
                    health={p.health}
                    earnedPoints={p.earned_points ?? 0}
                    maxPoints={p.max_points_available ?? 0}
                    department={p.primary_department ?? null}
                    targetEndDate={p.target_end_date}
                    {...(canEdit
                      ? {
                          onEdit: () => setEditingProject(p),
                          onDelete: () => setDeletingProject(p),
                        }
                      : {})}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {editingProject ? (
        <EditProjectDialog
          open={!!editingProject}
          onOpenChange={(v) => {
            if (!v) setEditingProject(null);
          }}
          project={editingProject}
        />
      ) : null}
      <ConfirmActionDialog
        open={!!deletingProject}
        onOpenChange={(v) => {
          if (!v) setDeletingProject(null);
        }}
        title="Delete project?"
        description="This removes the project from active views. Existing milestones and history stay in the database for audit purposes."
        confirmLabel="Delete project"
        isPending={deleteProject.isPending}
        onConfirm={() => {
          void handleDeleteProject();
        }}
      />
    </div>
  );
}

function EditProjectDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: ProjectRecord;
}) {
  const updateProject = useUpdateProject();
  const { addToast } = useToast();
  const [name, setName] = useState(project.name);
  const [descriptionSections, setDescriptionSections] = useState<ProjectDescriptionSections>(
    parseProjectDescription(project.description)
  );
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [startDate, setStartDate] = useState(project.start_date);
  const [targetEndDate, setTargetEndDate] = useState(project.target_end_date);

  useEffect(() => {
    if (!open) return;
    setName(project.name);
    setDescriptionSections(parseProjectDescription(project.description));
    setStatus(project.status);
    setStartDate(project.start_date);
    setTargetEndDate(project.target_end_date);
  }, [open, project]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !startDate || !targetEndDate) {
      addToast({ title: 'Fill all required fields', variant: 'warning' });
      return;
    }
    if (startDate > targetEndDate) {
      addToast({ title: 'Start date must be on or before the end date', variant: 'warning' });
      return;
    }
    try {
      const composedDescription = composeProjectDescription(descriptionSections);
      await updateProject.mutateAsync({
        projectId: project.id,
        name: name.trim(),
        description: composedDescription || null,
        status,
        startDate,
        targetEndDate,
      });
      addToast({ title: 'Project updated', variant: 'success' });
      onOpenChange(false);
    } catch (err) {
      addToast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  const formId = `edit-project-form-${project.id}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>Update the project name, description, status, and dates.</DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div className="space-y-2">
            <Label htmlFor="edit-proj-name">Name</Label>
            <Input
              id="edit-proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <ProjectDescriptionFields
            value={descriptionSections}
            onChange={setDescriptionSections}
          />
          <div className="space-y-2">
            <Label htmlFor="edit-proj-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger id="edit-proj-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-proj-start">Start date</Label>
              <Input
                id="edit-proj-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={targetEndDate || undefined}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-proj-end">Target end date</Label>
              <Input
                id="edit-proj-end"
                type="date"
                value={targetEndDate}
                onChange={(e) => setTargetEndDate(e.target.value)}
                min={startDate || undefined}
                required
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button form={formId} type="submit" disabled={updateProject.isPending}>
            {updateProject.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
