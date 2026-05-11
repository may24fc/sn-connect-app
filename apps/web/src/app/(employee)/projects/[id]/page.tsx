'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  type ChecklistItemRecord,
  type MilestoneRecord,
  useCreateChecklistItem,
  useCreateMilestone,
  useDeleteChecklistItem,
  useMilestoneChecklist,
  useProject,
  useProjectMilestones,
  useSubmitMilestone,
  useUpdateChecklistItem,
} from '@/hooks/useProjects';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ChecklistItem,
  ContributorAvatarStack,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  HealthPill,
  Input,
  Label,
  MilestoneStatusBadge,
  ProgressRing,
  Skeleton,
  useToast,
} from '@hr-portal/ui';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? '';
  const { user } = useAuth();
  const { addToast } = useToast();

  const { data: projectResp, isLoading: loadingProject } = useProject(projectId);
  const { data: milestonesResp, isLoading: loadingMilestones } = useProjectMilestones(projectId);
  const project = projectResp?.data;
  const milestones = milestonesResp?.data ?? [];

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isLead = !!project && project.lead_user_id === user?.id;
  const canEditProject = isLead || isAdmin;

  // Group milestones: monthly with their weekly children
  const grouped = useMemo(() => {
    const months = milestones
      .filter((m) => m.period_type === 'month')
      .sort((a, b) => a.period_start.localeCompare(b.period_start));
    return months.map((month) => ({
      month,
      weeks: milestones
        .filter((m) => m.period_type === 'week' && m.parent_milestone_id === month.id)
        .sort((a, b) => a.period_start.localeCompare(b.period_start)),
    }));
  }, [milestones]);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createParent, setCreateParent] = useState<MilestoneRecord | null>(null);

  if (loadingProject) {
    return (
      <div className="p-6">
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-sm text-zinc-500">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-start gap-4">
          <Link
            href="/projects"
            className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <ProgressRing value={project.progress_pct} size={64} strokeWidth={6} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {project.name}
              </h1>
              <HealthPill health={project.health} />
              <Badge variant="outline" className="capitalize">
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
            {project.description ? (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {project.description}
              </p>
            ) : null}
            <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {new Date(project.start_date).toLocaleDateString()} →{' '}
                {new Date(project.target_end_date).toLocaleDateString()}
              </span>
              <span className="font-medium text-amber-600">{project.points_total} points</span>
              {project.contributors.length > 0 ? (
                <ContributorAvatarStack
                  contributors={project.contributors.map((c) => ({ userId: c.user_id }))}
                />
              ) : null}
            </div>
          </div>
          {canEditProject ? (
            <Button
              onClick={() => {
                setCreateParent(null);
                setCreateOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Month
            </Button>
          ) : null}
        </div>
      </header>

      <main className="flex-1 overflow-x-auto overflow-y-hidden">
        {loadingMilestones ? (
          <div className="p-6">
            <Skeleton className="h-64" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p className="text-sm text-zinc-500">No milestones yet.</p>
              {canEditProject ? (
                <Button
                  className="mt-2"
                  size="sm"
                  onClick={() => {
                    setCreateParent(null);
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add first month
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex h-full gap-4 overflow-x-auto p-6">
            {grouped.map(({ month, weeks }) => (
              <MonthColumn
                key={month.id}
                month={month}
                weeks={weeks}
                projectId={projectId}
                canEdit={canEditProject}
                onAddWeek={() => {
                  setCreateParent(month);
                  setCreateOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </main>

      <CreateMilestoneDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        parent={createParent}
        onCreated={() => {
          setCreateOpen(false);
          addToast({ title: 'Milestone created', variant: 'success' });
        }}
      />
    </div>
  );
}

interface MonthColumnProps {
  month: MilestoneRecord;
  weeks: MilestoneRecord[];
  projectId: string;
  canEdit: boolean;
  onAddWeek: () => void;
}

function MonthColumn({
  month,
  weeks,
  projectId,
  canEdit,
  onAddWeek,
}: MonthColumnProps) {
  const { addToast } = useToast();
  const submitMutation = useSubmitMilestone();

  async function handleSubmit() {
    try {
      await submitMutation.mutateAsync({ milestoneId: month.id, projectId });
      addToast({ title: 'Milestone completed', variant: 'success' });
    } catch (e) {
      addToast({
        title: 'Complete failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  const canSubmit = canEdit && month.status !== 'approved' && month.progress_pct >= 100;

  return (
    <div className="flex w-80 shrink-0 flex-col rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {month.title}
            </h3>
            <p className="text-xs text-zinc-500">
              Due {new Date(month.due_date).toLocaleDateString()}
            </p>
          </div>
          <ProgressRing value={month.progress_pct} size={40} strokeWidth={4} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <MilestoneStatusBadge status={month.status} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {canSubmit ? (
            <Button size="sm" onClick={handleSubmit} disabled={submitMutation.isPending}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Complete
            </Button>
          ) : null}
          {canEdit && month.status !== 'approved' ? (
            <Button size="sm" variant="outline" onClick={onAddWeek}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Week
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {weeks.length === 0 ? (
          <ChecklistSection
            milestone={month}
            projectId={projectId}
            canEdit={canEdit && month.status !== 'approved'}
          />
        ) : (
          weeks.map((week) => (
            <WeekCard
              key={week.id}
              week={week}
              projectId={projectId}
              canEdit={canEdit && month.status !== 'approved'}
            />
          ))
        )}
      </div>
    </div>
  );
}

function WeekCard({
  week,
  projectId,
  canEdit,
}: {
  week: MilestoneRecord;
  projectId: string;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            {open ? (
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
            )}
            <span className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">
              {week.title}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs tabular-nums text-zinc-500">{Math.round(week.progress_pct)}%</span>
          </div>
        </button>
        {open ? (
          <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
            <ChecklistSection milestone={week} projectId={projectId} canEdit={canEdit} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ChecklistSection({
  milestone,
  projectId,
  canEdit,
}: {
  milestone: MilestoneRecord;
  projectId: string;
  canEdit: boolean;
}) {
  const { data, isLoading } = useMilestoneChecklist(milestone.id);
  const items = data?.data ?? [];
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const createItem = useCreateChecklistItem();
  const [newTitle, setNewTitle] = useState('');

  function handleToggle(item: ChecklistItemRecord, next: 'todo' | 'done') {
    void updateItem.mutateAsync({
      itemId: item.id,
      milestoneId: milestone.id,
      projectId,
      status: next,
    });
  }

  function handleDelete(itemId: string) {
    void deleteItem.mutateAsync({ itemId, milestoneId: milestone.id, projectId });
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createItem.mutateAsync({
      milestoneId: milestone.id,
      projectId,
      title: newTitle.trim(),
    });
    setNewTitle('');
  }

  return (
    <div>
      {isLoading ? (
        <Skeleton className="h-6" />
      ) : items.length === 0 && !canEdit ? (
        <p className="px-1 text-xs text-zinc-400">No checklist items.</p>
      ) : (
        <div className="space-y-0.5">
          {items.map((it) => (
            <ChecklistItem
              key={it.id}
              id={it.id}
              title={it.title}
              status={it.status}
              onToggle={(_id, next) => handleToggle(it, next)}
              {...(canEdit ? { onDelete: handleDelete } : {})}
              disabled={!canEdit}
            />
          ))}
        </div>
      )}
      {canEdit ? (
        <form onSubmit={handleAdd} className="mt-2 flex gap-1">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add item…"
            className="h-7 text-xs"
          />
          <Button type="submit" size="sm" variant="outline" disabled={!newTitle.trim()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function CreateMilestoneDialog({
  open,
  onOpenChange,
  projectId,
  parent,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  parent: MilestoneRecord | null;
  onCreated: () => void;
}) {
  const create = useCreateMilestone();
  const { addToast } = useToast();
  const periodType: 'month' | 'week' = parent ? 'week' : 'month';
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState('');
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState('');
  const [dueDate, setDueDate] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !periodStart || !periodEnd || !dueDate) {
      addToast({ title: 'Fill all fields', variant: 'warning' });
      return;
    }
    try {
      await create.mutateAsync({
        projectId,
        parentMilestoneId: parent?.id ?? null,
        periodType,
        title: title.trim(),
        periodStart,
        periodEnd,
        dueDate,
      });
      setTitle('');
      setPeriodEnd('');
      setDueDate('');
      onCreated();
    } catch (err) {
      addToast({
        title: 'Create failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{parent ? `Add Week to "${parent.title}"` : 'Add Monthly Milestone'}</DialogTitle>
          <DialogDescription>
            {parent
              ? 'Weekly sub-milestones break a month down into smaller, trackable units.'
              : 'Each monthly milestone can be submitted to your supervisor for approval.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ms-title">Title</Label>
            <Input
              id="ms-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ms-start">Start</Label>
              <Input
                id="ms-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ms-end">End</Label>
              <Input
                id="ms-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ms-due">Due</Label>
              <Input
                id="ms-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
