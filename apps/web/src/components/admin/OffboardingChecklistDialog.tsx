'use client';

import type { OffboardingRecord } from '@/hooks/useOffboarding';
import { queryKeys } from '@/lib/query-keys';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface TaskDraft {
  title: string;
  description: string;
  category: string;
  dueDate: string;
  ownerType: 'employee' | 'internal';
}

interface OffboardingTemplateTaskRecord {
  id: string;
  title: string;
  description: string | null;
  category: string;
  dueDate: string | null;
  ownerType: 'employee' | 'internal';
}

interface OffboardingTemplateResponse {
  data: {
    tasks: Array<OffboardingTemplateTaskRecord>;
    isPersisted: boolean;
  };
}

const DEFAULT_TASK_DRAFT: TaskDraft = {
  title: '',
  description: '',
  category: 'general',
  dueDate: '',
  ownerType: 'employee',
};

const TEMPLATE_RECORD_ID = '__template__';

function formatDateLabel(value: string | null): string {
  if (!value) {
    return 'No due date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No due date';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildTemplateTaskFromDraft(
  taskDraft: TaskDraft,
  taskId = crypto.randomUUID()
): OffboardingTemplateTaskRecord {
  return {
    id: taskId,
    title: taskDraft.title.trim(),
    description: taskDraft.description.trim() || null,
    category: taskDraft.category.trim(),
    dueDate: taskDraft.dueDate.trim() || null,
    ownerType: taskDraft.ownerType,
  };
}

export function OffboardingChecklistDialog({
  open,
  onOpenChange,
  records,
  selectedRecordId,
  onSelectedRecordChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: Array<OffboardingRecord>;
  selectedRecordId: string | null;
  onSelectedRecordChange: (recordId: string | null) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Offboarding Checklist</DialogTitle>
          <DialogDescription>
            Manage saved default offboarding tasks and apply them to active exit workflows.
          </DialogDescription>
        </DialogHeader>

        <OffboardingChecklistManager
          active={open}
          records={records}
          selectedRecordId={selectedRecordId}
          onSelectedRecordChange={onSelectedRecordChange}
        />
      </DialogContent>
    </Dialog>
  );
}

export function OffboardingChecklistManager({
  active = true,
  records,
  selectedRecordId,
  onSelectedRecordChange,
}: {
  active?: boolean;
  records: Array<OffboardingRecord>;
  selectedRecordId: string | null;
  onSelectedRecordChange: (recordId: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [taskDraft, setTaskDraft] = useState<TaskDraft>(DEFAULT_TASK_DRAFT);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const currentRecord = useMemo(
    () => records.find((entry) => entry.id === selectedRecordId) ?? null,
    [records, selectedRecordId]
  );
  const managingTemplate = selectedRecordId === TEMPLATE_RECORD_ID || records.length === 0;

  useEffect(() => {
    if (!active) {
      setTaskDraft(DEFAULT_TASK_DRAFT);
      setEditingTaskId(null);
    }
  }, [active]);

  useEffect(() => {
    if (!active) {
      return;
    }

    if (records.length === 0) {
      if (selectedRecordId !== TEMPLATE_RECORD_ID) {
        onSelectedRecordChange(TEMPLATE_RECORD_ID);
      }
      return;
    }

    const hasValidRecord =
      selectedRecordId === TEMPLATE_RECORD_ID ||
      records.some((entry) => entry.id === selectedRecordId);
    if (!hasValidRecord) {
      onSelectedRecordChange(records[0]?.id ?? TEMPLATE_RECORD_ID);
    }
  }, [active, onSelectedRecordChange, records, selectedRecordId]);

  useEffect(() => {
    setTaskDraft(DEFAULT_TASK_DRAFT);
    setEditingTaskId(null);
  }, [currentRecord?.id, managingTemplate]);

  const templateQuery = useQuery({
    queryKey: queryKeys.offboarding.template(),
    enabled: active,
    queryFn: async (): Promise<OffboardingTemplateResponse> => {
      const response = await fetch('/api/checklist-templates?flowType=offboarding&scope=default');
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to fetch offboarding template' }));
        throw new Error(error.error || 'Failed to fetch offboarding template');
      }
      return response.json();
    },
  });

  const templateTasks = templateQuery.data?.data.tasks ?? [];
  const tasks = managingTemplate
    ? templateTasks.map((task) => ({
        id: task.id,
        offboarding_id: 'template',
        title: task.title,
        description: task.description,
        category: task.category,
        is_completed: false,
        completed_at: null,
        completed_by: null,
        due_date: task.dueDate,
        assigned_to: null,
        created_at: '',
        updated_at: '',
        owner_type: task.ownerType,
        owner_label: task.ownerType === 'employee' ? 'Employee action' : 'Internal action',
        can_complete: false,
      }))
    : currentRecord?.offboarding_tasks ?? [];

  const invalidateOffboarding = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.offboarding.all });
  };

  const invalidateTemplate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.offboarding.template() });
  };

  const normalizeDraft = (): {
    title: string;
    description: string | null;
    category: string;
    dueDate: string | null;
    ownerType: 'employee' | 'internal';
  } => {
    const title = taskDraft.title.trim();
    const category = taskDraft.category.trim();
    const description = taskDraft.description.trim();
    const dueDate = taskDraft.dueDate.trim();

    if (!title) {
      throw new Error('Task title is required.');
    }

    if (!category) {
      throw new Error('Task category is required.');
    }

    if (dueDate) {
      const parsedDate = new Date(dueDate);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error('Due date must be a valid date.');
      }
    }

    return {
      title,
      description: description || null,
      category,
      dueDate: dueDate || null,
      ownerType: taskDraft.ownerType,
    };
  };

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!currentRecord?.id) {
        throw new Error('Offboarding record not found.');
      }

      const payload = normalizeDraft();
      const response = await fetch(`/api/offboarding/${currentRecord.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to create offboarding task' }));
        throw new Error(error.error || 'Failed to create offboarding task');
      }

      return response.json();
    },
    onSuccess: async () => {
      setTaskDraft(DEFAULT_TASK_DRAFT);
      await invalidateOffboarding();
      addToast({ title: 'Offboarding task added', variant: 'success' });
    },
    onError: (error) => {
      addToast({
        title: 'Unable to add offboarding task',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!currentRecord?.id) {
        throw new Error('Offboarding record not found.');
      }

      const payload = normalizeDraft();
      const response = await fetch(`/api/offboarding/${currentRecord.id}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, ...payload }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to update offboarding task' }));
        throw new Error(error.error || 'Failed to update offboarding task');
      }

      return response.json();
    },
    onSuccess: async () => {
      setTaskDraft(DEFAULT_TASK_DRAFT);
      setEditingTaskId(null);
      await invalidateOffboarding();
      addToast({ title: 'Offboarding task updated', variant: 'success' });
    },
    onError: (error) => {
      addToast({
        title: 'Unable to update offboarding task',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!currentRecord?.id) {
        throw new Error('Offboarding record not found.');
      }

      const response = await fetch(`/api/offboarding/${currentRecord.id}/tasks`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to delete offboarding task' }));
        throw new Error(error.error || 'Failed to delete offboarding task');
      }

      return response.json();
    },
    onSuccess: async () => {
      setTaskDraft(DEFAULT_TASK_DRAFT);
      setEditingTaskId(null);
      await invalidateOffboarding();
      addToast({ title: 'Offboarding task removed', variant: 'success' });
    },
    onError: (error) => {
      addToast({
        title: 'Unable to remove offboarding task',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    },
  });

  const clearChecklistMutation = useMutation({
    mutationFn: async () => {
      if (!currentRecord?.id) {
        throw new Error('Offboarding record not found.');
      }

      for (const task of currentRecord.offboarding_tasks) {
        const response = await fetch(`/api/offboarding/${currentRecord.id}/tasks`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id }),
        });

        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ error: 'Failed to delete offboarding task' }));
          throw new Error(error.error || 'Failed to delete offboarding task');
        }
      }
    },
    onSuccess: async () => {
      setTaskDraft(DEFAULT_TASK_DRAFT);
      setEditingTaskId(null);
      await invalidateOffboarding();
      addToast({ title: 'Offboarding checklist cleared', variant: 'success' });
    },
    onError: (error) => {
      addToast({
        title: 'Unable to clear offboarding checklist',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async ({ tasks }: { tasks: Array<OffboardingTemplateTaskRecord> }) => {
      const response = await fetch('/api/checklist-templates?flowType=offboarding&scope=default', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to save offboarding template' }));
        throw new Error(error.error || 'Failed to save offboarding template');
      }

      return response.json();
    },
    onSuccess: async () => {
      setTaskDraft(DEFAULT_TASK_DRAFT);
      setEditingTaskId(null);
      await invalidateTemplate();
    },
    onError: (error) => {
      addToast({
        title: 'Unable to save default offboarding checklist',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    },
  });

  const applyDefaultTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!currentRecord?.id) {
        throw new Error('Offboarding record not found.');
      }

      if (templateTasks.length === 0) {
        throw new Error('No default offboarding template has been created yet.');
      }

      const existingKeys = new Set(
        currentRecord.offboarding_tasks.map(
          (task) => `${task.category.toLowerCase()}::${task.title.trim().toLowerCase()}`
        )
      );

      const tasksToInsert = templateTasks.filter(
        (task) =>
          !existingKeys.has(`${task.category.toLowerCase()}::${task.title.trim().toLowerCase()}`)
      );

      if (tasksToInsert.length === 0) {
        throw new Error('All saved default tasks are already on this checklist.');
      }

      for (const task of tasksToInsert) {
        const response = await fetch(`/api/offboarding/${currentRecord.id}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.title,
            description: task.description,
            category: task.category,
            dueDate: task.dueDate,
            ownerType: task.ownerType,
          }),
        });

        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ error: 'Failed to apply default offboarding checklist' }));
          throw new Error(error.error || 'Failed to apply default offboarding checklist');
        }
      }

      return tasksToInsert.length;
    },
    onSuccess: async (count) => {
      await invalidateOffboarding();
      addToast({
        title: 'Default checklist applied',
        description: `${count} offboarding task${count === 1 ? '' : 's'} added.`,
        variant: 'success',
      });
    },
    onError: (error) => {
      addToast({
        title: 'Unable to apply default checklist',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    },
  });

  const isSavingTask =
    createTaskMutation.isPending ||
    updateTaskMutation.isPending ||
    saveTemplateMutation.isPending;

  const persistTemplateTasks = async (
    nextTasks: Array<OffboardingTemplateTaskRecord>,
    successTitle: string
  ): Promise<void> => {
    await saveTemplateMutation.mutateAsync({ tasks: nextTasks });
    addToast({ title: successTitle, variant: 'success' });
  };

  const dialogDescription = useMemo(() => {
    if (managingTemplate) {
      return 'Build the saved default offboarding checklist now, even before any offboarding record exists.';
    }

    return `Manage tasks for ${currentRecord?.employee?.full_name ?? 'this offboarding record'} and apply the saved default checklist when needed.`;
  }, [currentRecord, managingTemplate]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{dialogDescription}</p>

      <div className="space-y-2">
        <Label htmlFor="offboarding-record-selector">Checklist target</Label>
        <Select value={selectedRecordId ?? TEMPLATE_RECORD_ID} onValueChange={onSelectedRecordChange}>
          <SelectTrigger id="offboarding-record-selector" className="bg-white">
            <SelectValue placeholder="Select checklist target" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TEMPLATE_RECORD_ID}>Default offboarding checklist template</SelectItem>
            {records.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {(entry.employee?.full_name ?? 'Unknown employee') + ' • ' + entry.exit_type.replaceAll('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {managingTemplate
                  ? 'Default offboarding checklist template'
                  : currentRecord?.employee?.full_name ?? 'Unknown employee'}
              </h3>
              {managingTemplate ? (
                <Badge variant="secondary">Template mode</Badge>
              ) : (
                <>
                  <Badge variant={currentRecord?.status === 'completed' ? 'success' : 'warning'}>
                    {currentRecord?.status.replaceAll('_', ' ') ?? 'in progress'}
                  </Badge>
                  <Badge variant="secondary">{currentRecord?.exit_type.replaceAll('_', ' ')}</Badge>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {managingTemplate
                ? 'Define the saved default checklist that admins can prepare before an exit workflow starts.'
                : `Last working day: ${formatDateLabel(currentRecord?.last_working_day ?? null)}`}
            </p>
            {!managingTemplate ? (
              <p className="text-sm text-muted-foreground">
                {currentRecord?.employee?.email ?? 'No email available'}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">{tasks.length} task{tasks.length === 1 ? '' : 's'}</Badge>
            {managingTemplate ? (
              <Button
                variant="outline"
                size="sm"
                disabled={tasks.length === 0 || saveTemplateMutation.isPending}
                onClick={() => {
                  if (tasks.length === 0) {
                    return;
                  }
                  void persistTemplateTasks([], 'Default checklist cleared');
                }}
              >
                {saveTemplateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Clear template
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={applyDefaultTemplateMutation.isPending || templateTasks.length === 0}
                  onClick={() => applyDefaultTemplateMutation.mutate()}
                >
                  {applyDefaultTemplateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Apply default checklist
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={tasks.length === 0 || clearChecklistMutation.isPending}
                  onClick={() => clearChecklistMutation.mutate()}
                >
                  {clearChecklistMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Clear tasks
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {managingTemplate ? 'Saved default tasks' : 'Current offboarding tasks'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {managingTemplate
                ? 'These tasks are available before a real offboarding record exists and can be applied later.'
                : 'Review, edit, or remove tasks already attached to this exit workflow.'}
            </p>
          </div>

          {managingTemplate && templateQuery.isLoading ? (
            <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
              <EmptyState
                icon={<Loader2 className="h-5 w-5 animate-spin" />}
                title="Loading offboarding tasks"
                description="Retrieving the saved default offboarding checklist."
                size="sm"
              />
            </div>
          ) : managingTemplate && templateQuery.isError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
              <EmptyState
                icon={AlertCircle}
                title="Failed to load the saved default offboarding checklist"
                description="The default offboarding template could not be retrieved."
                size="sm"
              />
            </div>
          ) : tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{task.category}</Badge>
                        {!managingTemplate ? (
                          <Badge variant={task.is_completed ? 'success' : 'warning'}>
                            {task.is_completed ? 'Completed' : 'Pending'}
                          </Badge>
                        ) : null}
                        <Badge variant={task.owner_type === 'employee' ? 'outline' : 'secondary'}>
                          {task.owner_label}
                        </Badge>
                      </div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.description?.trim() || 'No description provided.'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {formatDateLabel(task.due_date)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSavingTask}
                        onClick={() => {
                          setEditingTaskId(task.id);
                          setTaskDraft({
                            title: task.title,
                            description: task.description ?? '',
                            category: task.category,
                            dueDate: task.due_date ?? '',
                            ownerType: task.owner_type,
                          });
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleteTaskMutation.isPending || saveTemplateMutation.isPending}
                        onClick={() => {
                          if (managingTemplate) {
                            void persistTemplateTasks(
                              templateTasks.filter((templateTask) => templateTask.id !== task.id),
                              'Default offboarding checklist updated'
                            );
                            return;
                          }

                          deleteTaskMutation.mutate(task.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
              <EmptyState
                icon={Pencil}
                title={managingTemplate ? 'No saved default offboarding tasks yet' : 'No offboarding tasks have been assigned yet'}
                description={managingTemplate ? 'Create default offboarding tasks here so they are ready before a record exists.' : 'Tasks will appear here once the offboarding workflow is configured.'}
                size="sm"
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {editingTaskId
                  ? managingTemplate
                    ? 'Edit default offboarding task'
                    : 'Edit offboarding task'
                  : managingTemplate
                    ? 'Add default offboarding task'
                    : 'Add offboarding task'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {managingTemplate
                  ? 'Prepare the saved default offboarding checklist before any record is initiated.'
                  : 'Define the next action in the exit workflow and decide whether it belongs to the employee or the internal team.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="offboarding-task-title">Title</Label>
              <Input
                id="offboarding-task-title"
                className="bg-white"
                value={taskDraft.title}
                onChange={(event) =>
                  setTaskDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Example: Return company laptop"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offboarding-task-description">Description</Label>
              <Textarea
                id="offboarding-task-description"
                className="bg-white"
                rows={4}
                value={taskDraft.description}
                onChange={(event) =>
                  setTaskDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Add instructions or context for this offboarding task."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="offboarding-task-category">Category</Label>
                <Input
                  id="offboarding-task-category"
                  className="bg-white"
                  value={taskDraft.category}
                  onChange={(event) =>
                    setTaskDraft((current) => ({ ...current, category: event.target.value }))
                  }
                  placeholder="equipment"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="offboarding-task-due-date">
                  {managingTemplate ? 'Optional due date' : 'Due date'}
                </Label>
                <Input
                  id="offboarding-task-due-date"
                  className="bg-white"
                  type="date"
                  value={taskDraft.dueDate}
                  onChange={(event) =>
                    setTaskDraft((current) => ({ ...current, dueDate: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="offboarding-task-owner-type">Owner</Label>
              <Select
                value={taskDraft.ownerType}
                onValueChange={(value) =>
                  setTaskDraft((current) => ({
                    ...current,
                    ownerType: value as TaskDraft['ownerType'],
                  }))
                }
              >
                <SelectTrigger id="offboarding-task-owner-type" className="bg-white">
                  <SelectValue placeholder="Choose task owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee action</SelectItem>
                  <SelectItem value="internal">Internal action</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900/60">
              {taskDraft.ownerType === 'employee'
                ? 'This task appears as an employee action.'
                : 'This task stays under admin or HR ownership.'}
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={isSavingTask}
                onClick={() => {
                  if (managingTemplate) {
                    const nextTask = buildTemplateTaskFromDraft(taskDraft, editingTaskId ?? undefined);
                    const nextTasks = editingTaskId
                      ? templateTasks.map((task) => (task.id === editingTaskId ? nextTask : task))
                      : [...templateTasks, nextTask];

                    void persistTemplateTasks(
                      nextTasks,
                      editingTaskId
                        ? 'Default offboarding checklist updated'
                        : 'Default offboarding task added'
                    );
                    return;
                  }

                  if (editingTaskId) {
                    updateTaskMutation.mutate(editingTaskId);
                    return;
                  }

                  createTaskMutation.mutate();
                }}
              >
                {isSavingTask ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : editingTaskId ? (
                  <Pencil className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {editingTaskId ? 'Save changes' : managingTemplate ? 'Save default task' : 'Add offboarding task'}
              </Button>
              {editingTaskId ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingTaskId(null);
                    setTaskDraft(DEFAULT_TASK_DRAFT);
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OffboardingChecklistDialog;