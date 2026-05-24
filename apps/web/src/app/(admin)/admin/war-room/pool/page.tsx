'use client';

import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  useProjectPool,
  useProjectPoolCount,
  useRemoveProjectPoolItem,
  useRestoreProjectPoolItem,
  useUpdateProjectPoolItem,
  type BacklogPriority,
  type ProjectBacklogItem,
  type ProjectBacklogStatus,
} from '@/hooks/useProjectPool';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  HoverActionButtons,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
  type HoverActionItem,
} from '@hr-portal/ui';
import { ArchiveRestore, ArrowLeft, Inbox, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const PRIORITY_TONE: Record<BacklogPriority, 'secondary' | 'default' | 'destructive'> = {
  Low: 'secondary',
  Medium: 'secondary',
  High: 'default',
  Urgent: 'destructive',
};

const PRIORITY_OPTIONS: BacklogPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

interface EditFormState {
  title: string;
  problemStatement: string;
  objective: string;
  technicalScope: string;
  targetDepartments: string;
  priority: BacklogPriority;
}

interface ProjectPoolGridProps {
  items: ProjectBacklogItem[];
  isLoading: boolean;
  isError: boolean;
  emptyTitle: string;
  emptyDescription: string;
  getActions?: (item: ProjectBacklogItem) => HoverActionItem[];
}

function formatCsv(values: string[]): string {
  return values.join(', ');
}

function parseCsv(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function buildEditFormState(item: ProjectBacklogItem): EditFormState {
  return {
    title: item.title,
    problemStatement: item.problem_statement,
    objective: item.objective,
    technicalScope: formatCsv(item.technical_scope),
    targetDepartments: formatCsv(item.target_departments),
    priority: item.priority,
  };
}

function ProjectPoolGrid({
  items,
  isLoading,
  isError,
  emptyTitle,
  emptyDescription,
  getActions,
}: ProjectPoolGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <Skeleton key={item} className="h-56" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={Inbox}
        title="Could not load the project pool"
        description="Refresh the page or try again in a moment."
      />
    );
  }

  if (items.length === 0) {
    return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const actions = getActions?.(item) ?? [];
        const hasActions = actions.length > 0;

        return (
          <Card
            key={item.id}
            className="group relative flex flex-col transition-all hover:border-indigo-500/60 hover:shadow-md"
          >
            <HoverActionButtons actions={actions} placement="bottom-right" />
            <CardHeader className={hasActions ? 'pb-3 pr-4' : 'pb-3'}>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                <Badge variant={PRIORITY_TONE[item.priority]}>{item.priority}</Badge>
              </div>
            </CardHeader>
            <CardContent
              className={
                hasActions
                  ? 'flex flex-1 flex-col gap-3 pb-12 text-sm'
                  : 'flex flex-1 flex-col gap-3 text-sm'
              }
            >
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
        );
      })}
    </div>
  );
}

export default function AdminProjectPoolPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();
  const canManagePool = user?.role === 'super_admin';

  const claimablePool = useProjectPool({ status: 'claimable' });
  const claimableCount = useProjectPoolCount({ status: 'claimable' });
  const archivedPool = useProjectPool({ status: 'archived', enabled: canManagePool });
  const archivedCount = useProjectPoolCount({ status: 'archived', enabled: canManagePool });

  const updateProjectPoolItem = useUpdateProjectPoolItem();
  const removeProjectPoolItem = useRemoveProjectPoolItem();
  const restoreProjectPoolItem = useRestoreProjectPoolItem();

  const [activeTab, setActiveTab] = useState<ProjectBacklogStatus>('claimable');
  const [editingItem, setEditingItem] = useState<ProjectBacklogItem | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [removingItem, setRemovingItem] = useState<ProjectBacklogItem | null>(null);

  const claimableItems = claimablePool.data?.items ?? [];
  const archivedItems = archivedPool.data?.items ?? [];
  const hasPendingAction =
    updateProjectPoolItem.isPending ||
    removeProjectPoolItem.isPending ||
    restoreProjectPoolItem.isPending;

  const handleOpenEdit = (item: ProjectBacklogItem) => {
    setEditingItem(item);
    setEditForm(buildEditFormState(item));
  };

  const handleCloseEdit = (open: boolean) => {
    if (updateProjectPoolItem.isPending) {
      return;
    }

    if (!open) {
      setEditingItem(null);
      setEditForm(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editForm) {
      return;
    }

    try {
      await updateProjectPoolItem.mutateAsync({
        backlogId: editingItem.id,
        title: editForm.title,
        problemStatement: editForm.problemStatement,
        objective: editForm.objective,
        technicalScope: parseCsv(editForm.technicalScope),
        targetDepartments: parseCsv(editForm.targetDepartments),
        priority: editForm.priority,
      });

      setEditingItem(null);
      setEditForm(null);
      addToast({
        title: 'Project pool item updated',
        description: 'The intake details were saved successfully.',
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Update failed',
        description:
          error instanceof Error
            ? `${error.message}. Cause: the server rejected the backlog update. Fix: review the fields and try again.`
            : 'Cause: the update request failed. Fix: retry the save action.',
        variant: 'error',
      });
    }
  };

  const handleRemoveItem = async () => {
    if (!removingItem) {
      return;
    }

    try {
      await removeProjectPoolItem.mutateAsync(removingItem.id);
      setRemovingItem(null);
      setActiveTab('claimable');
      addToast({
        title: 'Project removed from pool',
        description: 'The intake item was archived and moved to the archived backlog tab.',
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Remove failed',
        description:
          error instanceof Error
            ? `${error.message}. Cause: the server could not archive the backlog item. Fix: refresh the pool and retry.`
            : 'Cause: the remove request failed. Fix: retry after refreshing the pool.',
        variant: 'error',
      });
    }
  };

  const handleRestoreItem = async (item: ProjectBacklogItem) => {
    try {
      await restoreProjectPoolItem.mutateAsync(item.id);
      addToast({
        title: 'Project restored to pool',
        description: 'The archived intake item is claimable again.',
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Restore failed',
        description:
          error instanceof Error
            ? `${error.message}. Cause: the server could not move the archived item back to claimable. Fix: refresh the archived tab and retry.`
            : 'Cause: the restore request failed. Fix: retry after refreshing the archived tab.',
        variant: 'error',
      });
    }
  };

  const claimableActions = (item: ProjectBacklogItem): HoverActionItem[] => {
    if (!canManagePool) {
      return [];
    }

    return [
      {
        label: `Edit ${item.title}`,
        icon: <Pencil className="h-3.5 w-3.5" />,
        onClick: () => handleOpenEdit(item),
        disabled: hasPendingAction,
      },
      {
        label: `Remove ${item.title} from pool`,
        icon: <Trash2 className="h-3.5 w-3.5" />,
        onClick: () => setRemovingItem(item),
        tone: 'danger',
        disabled: hasPendingAction,
      },
    ];
  };

  const archivedActions = (item: ProjectBacklogItem): HoverActionItem[] => {
    if (!canManagePool) {
      return [];
    }

    return [
      {
        label: `Restore ${item.title} to the claimable pool`,
        icon: <ArchiveRestore className="h-3.5 w-3.5" />,
        onClick: () => {
          void handleRestoreItem(item);
        },
        tone: 'success',
        disabled: hasPendingAction,
      },
    ];
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/projects')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Project Pool
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Admins can review the backlog here. Super-admins can curate active items and restore archived ones before interns claim them.
            </p>
          </div>
        </div>
      </header>

      {canManagePool ? (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProjectBacklogStatus)}>
          <TabsList>
            <TabsTrigger value="claimable">
              Claimable ({claimableCount.data?.count ?? claimableItems.length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archived ({archivedCount.data?.count ?? archivedItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="claimable" className="pt-4">
            <ProjectPoolGrid
              items={claimableItems}
              isLoading={claimablePool.isLoading}
              isError={claimablePool.isError}
              emptyTitle="Pool is empty"
              emptyDescription="When the CEO sends a new project request via Telegram, it will appear here."
              getActions={claimableActions}
            />
          </TabsContent>

          <TabsContent value="archived" className="pt-4">
            <ProjectPoolGrid
              items={archivedItems}
              isLoading={archivedPool.isLoading}
              isError={archivedPool.isError}
              emptyTitle="No archived project requests"
              emptyDescription="Archived pool items show up here so super-admins can restore them when needed."
              getActions={archivedActions}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <ProjectPoolGrid
          items={claimableItems}
          isLoading={claimablePool.isLoading}
          isError={claimablePool.isError}
          emptyTitle="Pool is empty"
          emptyDescription="When the CEO sends a new project request via Telegram, it will appear here."
        />
      )}

      <Dialog open={Boolean(editingItem && editForm)} onOpenChange={handleCloseEdit}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit project pool item</DialogTitle>
            <DialogDescription>
              Update the intake details before an intern claims the project.
            </DialogDescription>
          </DialogHeader>

          {editForm ? (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="pool-title">Title</Label>
                <Input
                  id="pool-title"
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, title: event.target.value } : current
                    )
                  }
                  disabled={updateProjectPoolItem.isPending}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pool-problem">Problem statement</Label>
                <Textarea
                  id="pool-problem"
                  rows={4}
                  value={editForm.problemStatement}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, problemStatement: event.target.value } : current
                    )
                  }
                  disabled={updateProjectPoolItem.isPending}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pool-objective">Objective</Label>
                <Textarea
                  id="pool-objective"
                  rows={3}
                  value={editForm.objective}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, objective: event.target.value } : current
                    )
                  }
                  disabled={updateProjectPoolItem.isPending}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="pool-scope">Technical scope</Label>
                  <Input
                    id="pool-scope"
                    value={editForm.technicalScope}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current ? { ...current, technicalScope: event.target.value } : current
                      )
                    }
                    disabled={updateProjectPoolItem.isPending}
                    placeholder="React, Supabase, Telegram"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="pool-departments">Target departments</Label>
                  <Input
                    id="pool-departments"
                    value={editForm.targetDepartments}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current ? { ...current, targetDepartments: event.target.value } : current
                      )
                    }
                    disabled={updateProjectPoolItem.isPending}
                    placeholder="Operations, Marketing"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={editForm.priority}
                  onValueChange={(value) =>
                    setEditForm((current) =>
                      current ? { ...current, priority: value as BacklogPriority } : current
                    )
                  }
                  disabled={updateProjectPoolItem.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleCloseEdit(false)}
              disabled={updateProjectPoolItem.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveEdit()}
              disabled={updateProjectPoolItem.isPending || !editForm}
            >
              {updateProjectPoolItem.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(removingItem)}
        onOpenChange={(open) => {
          if (!removeProjectPoolItem.isPending && !open) {
            setRemovingItem(null);
          }
        }}
        title="Remove project from pool"
        description={
          removingItem
            ? `"${removingItem.title}" will be archived so it no longer appears in the claimable pool. You can restore it later from the archived tab.`
            : 'This item will be archived and removed from the claimable pool. You can restore it later from the archived tab.'
        }
        confirmLabel="Remove from pool"
        isPending={removeProjectPoolItem.isPending}
        onConfirm={() => void handleRemoveItem()}
      />
    </div>
  );
}
