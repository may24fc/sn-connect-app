'use client';

import type { OnboardingProfileListItem } from '@/hooks/useOnboardingProfiles';
import { queryKeys } from '@/lib/query-keys';
import {
  Badge,
  Button,
  Checkbox,
  CountBadge,
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
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface OnboardingTaskRecord {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_completed: boolean;
  is_required: boolean;
  due_days_from_start: number;
  requires_submission?: boolean;
  submission_type?: 'none' | 'link' | 'document' | 'link_or_document';
  submission_label?: string | null;
  submission_description?: string | null;
  reference_url?: string | null;
}

interface OnboardingChecklistRecord {
  id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  onboarding_tasks: Array<OnboardingTaskRecord>;
}

interface OnboardingTemplateTaskRecord {
  id: string;
  title: string;
  description: string | null;
  category: string;
  isRequired: boolean;
  dueDaysFromStart: number;
  requiresSubmission: boolean;
  submissionType: 'none' | 'link' | 'document' | 'link_or_document';
  submissionLabel: string | null;
  submissionDescription: string | null;
  referenceUrl: string | null;
}

interface OnboardingTemplateResponse {
  data: {
    tasks: Array<OnboardingTemplateTaskRecord>;
    isPersisted: boolean;
  };
}

interface TaskDraft {
  title: string;
  description: string;
  category: string;
  dueDaysFromStart: string;
  isRequired: boolean;
  requiresSubmission: boolean;
  submissionType: 'none' | 'link' | 'document' | 'link_or_document';
  submissionLabel: string;
  submissionDescription: string;
  referenceUrl: string;
}

const DEFAULT_TASK_DRAFT: TaskDraft = {
  title: '',
  description: '',
  category: 'general',
  dueDaysFromStart: '7',
  isRequired: true,
  requiresSubmission: false,
  submissionType: 'none',
  submissionLabel: '',
  submissionDescription: '',
  referenceUrl: '',
};

const TEMPLATE_PROFILE_ID = '__template__';

function formatSubmissionTypeLabel(value: TaskDraft['submissionType']): string {
  switch (value) {
    case 'link':
      return 'Link required';
    case 'document':
      return 'Document required';
    case 'link_or_document':
      return 'Link or document required';
    default:
      return 'No proof required';
  }
}

function buildWizardSummary(profile: OnboardingProfileListItem | undefined): {
  description: string;
  statusLabel: string;
  isComplete: boolean;
} {
  if (!profile) {
    return {
      description:
        'Select a person to review the onboarding wizard and any additional checklist items.',
      statusLabel: 'Not selected',
      isComplete: false,
    };
  }

  if (profile.status === 'completed') {
    return {
      description: 'The onboarding wizard form has been submitted and is ready for review.',
      statusLabel: 'Submitted',
      isComplete: true,
    };
  }

  return {
    description: `The onboarding wizard is still in progress. Current step: ${profile.current_step.replaceAll('_', ' ')}.`,
    statusLabel: profile.current_step.replaceAll('_', ' '),
    isComplete: false,
  };
}

function buildTemplateTaskFromDraft(
  taskDraft: TaskDraft,
  taskId = crypto.randomUUID()
): OnboardingTemplateTaskRecord {
  return {
    id: taskId,
    title: taskDraft.title.trim(),
    description: taskDraft.description.trim() || null,
    category: taskDraft.category.trim(),
    isRequired: taskDraft.isRequired,
    dueDaysFromStart: Number.parseInt(taskDraft.dueDaysFromStart, 10),
    requiresSubmission: taskDraft.requiresSubmission,
    submissionType: taskDraft.requiresSubmission ? taskDraft.submissionType : 'none',
    submissionLabel:
      taskDraft.requiresSubmission && taskDraft.submissionLabel.trim().length > 0
        ? taskDraft.submissionLabel.trim()
        : null,
    submissionDescription:
      taskDraft.requiresSubmission && taskDraft.submissionDescription.trim().length > 0
        ? taskDraft.submissionDescription.trim()
        : null,
    referenceUrl: taskDraft.referenceUrl.trim() || null,
  };
}

export function OnboardingChecklistDialog({
  open,
  onOpenChange,
  profiles,
  roleLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: Array<OnboardingProfileListItem>;
  roleLabel: 'employee' | 'intern';
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Onboarding Checklist</DialogTitle>
          <DialogDescription>
            Add, edit, and delete custom checklist items for a specific {roleLabel} while keeping
            the onboarding wizard as item one.
          </DialogDescription>
        </DialogHeader>

        <OnboardingChecklistManager
          profiles={profiles}
          roleLabel={roleLabel}
          active={open}
          closeDialog={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function OnboardingChecklistManager({
  active = true,
  closeDialog,
  profiles,
  roleLabel,
}: {
  active?: boolean;
  closeDialog?: () => void;
  profiles: Array<OnboardingProfileListItem>;
  roleLabel: 'employee' | 'intern';
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(DEFAULT_TASK_DRAFT);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const sortedProfiles = useMemo(
    () => [...profiles].sort((left, right) => left.full_name.localeCompare(right.full_name)),
    [profiles]
  );

  useEffect(() => {
    if (!active) {
      return;
    }

    if (sortedProfiles.length === 0) {
      setSelectedProfileId(TEMPLATE_PROFILE_ID);
      return;
    }

    const existingProfile =
      selectedProfileId === TEMPLATE_PROFILE_ID ||
      sortedProfiles.some((profile) => profile.id === selectedProfileId);
    if (!existingProfile) {
      setSelectedProfileId(sortedProfiles[0]?.id ?? '');
    }
  }, [active, selectedProfileId, sortedProfiles]);

  useEffect(() => {
    setTaskDraft(DEFAULT_TASK_DRAFT);
    setEditingTaskId(null);
  }, [selectedProfileId]);

  const selectedProfile = sortedProfiles.find((profile) => profile.id === selectedProfileId);
  const managingTemplate =
    selectedProfileId === TEMPLATE_PROFILE_ID || sortedProfiles.length === 0 || !selectedProfile?.employee_id;
  const wizardSummary = buildWizardSummary(selectedProfile);

  const templateQuery = useQuery({
    queryKey: queryKeys.onboarding.template(roleLabel),
    enabled: active,
    queryFn: async (): Promise<OnboardingTemplateResponse> => {
      const response = await fetch(
        `/api/checklist-templates?flowType=onboarding&scope=${roleLabel}`
      );
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to fetch onboarding template' }));
        throw new Error(error.error || 'Failed to fetch onboarding template');
      }
      return response.json();
    },
  });

  const templateTasks = templateQuery.data?.data.tasks ?? [];

  const checklistQuery = useQuery({
    queryKey: selectedProfile?.employee_id
      ? queryKeys.onboarding.checklist(selectedProfile.employee_id)
      : [...queryKeys.onboarding.all, 'checklist', 'unavailable'],
    enabled: active && Boolean(selectedProfile?.employee_id),
    queryFn: async (): Promise<{ data: Array<OnboardingChecklistRecord> }> => {
      const response = await fetch(`/api/onboarding?employeeId=${selectedProfile?.employee_id}`);
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to fetch onboarding checklist' }));
        throw new Error(error.error || 'Failed to fetch onboarding checklist');
      }
      return response.json();
    },
  });

  const checklist = checklistQuery.data?.data?.[0] ?? null;

  const displayedTasks = managingTemplate
    ? templateTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        is_completed: false,
        is_required: task.isRequired,
        due_days_from_start: task.dueDaysFromStart,
        requires_submission: task.requiresSubmission,
        submission_type: task.submissionType,
        submission_label: task.submissionLabel,
        submission_description: task.submissionDescription,
        reference_url: task.referenceUrl,
      }))
    : checklist?.onboarding_tasks ?? [];

  const invalidateChecklist = async (employeeId: string): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.onboarding.checklist(employeeId),
    });
  };

  const invalidateSelectedChecklist = async (): Promise<void> => {
    if (selectedProfile?.employee_id) {
      await invalidateChecklist(selectedProfile.employee_id);
    }
  };

  const invalidateTemplate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.template(roleLabel) });
  };

  const ensureChecklist = async (): Promise<string> => {
    if (!selectedProfile?.employee_id) {
      throw new Error('This onboarding profile is not linked to an employee record yet.');
    }

    if (checklist?.id) {
      return checklist.id;
    }

    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: selectedProfile.employee_id,
        tasks: templateTasks.map((task) => ({
          title: task.title,
          description: task.description,
          category: task.category,
          isRequired: task.isRequired,
          dueDaysFromStart: task.dueDaysFromStart,
          requiresSubmission: task.requiresSubmission,
          submissionType: task.submissionType,
          submissionLabel: task.submissionLabel,
          submissionDescription: task.submissionDescription,
          referenceUrl: task.referenceUrl,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Failed to create onboarding checklist' }));
      throw new Error(error.error || 'Failed to create onboarding checklist');
    }

    const payload = (await response.json()) as { data: { id: string } };
    await invalidateSelectedChecklist();
    return payload.data.id;
  };

  const normalizeDraft = (): {
    title: string;
    description: string | null;
    category: string;
    dueDaysFromStart: number;
    isRequired: boolean;
    requiresSubmission: boolean;
    submissionType: 'none' | 'link' | 'document' | 'link_or_document';
    submissionLabel: string | null;
    submissionDescription: string | null;
    referenceUrl: string | null;
  } => {
    const title = taskDraft.title.trim();
    const category = taskDraft.category.trim();
    const dueDaysFromStart = Number.parseInt(taskDraft.dueDaysFromStart, 10);
    const submissionLabel = taskDraft.submissionLabel.trim();
    const submissionDescription = taskDraft.submissionDescription.trim();
    const referenceUrl = taskDraft.referenceUrl.trim();

    if (!title) {
      throw new Error('Task title is required.');
    }

    if (!category) {
      throw new Error('Task category is required.');
    }

    if (!Number.isFinite(dueDaysFromStart) || dueDaysFromStart < 1 || dueDaysFromStart > 365) {
      throw new Error('Due days must be between 1 and 365.');
    }

    if (taskDraft.requiresSubmission && taskDraft.submissionType === 'none') {
      throw new Error('Select a proof type when this task requires a link or document.');
    }

    if (referenceUrl) {
      let parsedUrl: URL;

      try {
        parsedUrl = new URL(referenceUrl);
      } catch {
        throw new Error('Reference link must be a valid URL.');
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Reference link must start with http:// or https://.');
      }
    }

    return {
      title,
      description: taskDraft.description.trim() || null,
      category,
      dueDaysFromStart,
      isRequired: taskDraft.isRequired,
      requiresSubmission: taskDraft.requiresSubmission,
      submissionType: taskDraft.requiresSubmission ? taskDraft.submissionType : 'none',
      submissionLabel:
        taskDraft.requiresSubmission && submissionLabel.length > 0 ? submissionLabel : null,
      submissionDescription:
        taskDraft.requiresSubmission && submissionDescription.length > 0
          ? submissionDescription
          : null,
      referenceUrl: referenceUrl || null,
    };
  };

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const payload = normalizeDraft();
      const checklistId = await ensureChecklist();
      const response = await fetch(`/api/onboarding/${checklistId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to add onboarding task' }));
        throw new Error(error.error || 'Failed to add onboarding task');
      }

      return response.json();
    },
    onSuccess: async () => {
      setTaskDraft(DEFAULT_TASK_DRAFT);
      await invalidateSelectedChecklist();
      addToast({ title: 'Checklist task added', variant: 'success' });
    },
    onError: (error) => {
      addToast({
        title: 'Unable to add checklist task',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const payload = normalizeDraft();
      if (!checklist?.id) {
        throw new Error('Checklist not found.');
      }

      const response = await fetch(`/api/onboarding/${checklist.id}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, ...payload }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to update onboarding task' }));
        throw new Error(error.error || 'Failed to update onboarding task');
      }

      return response.json();
    },
    onSuccess: async () => {
      setTaskDraft(DEFAULT_TASK_DRAFT);
      setEditingTaskId(null);
      await invalidateSelectedChecklist();
      addToast({ title: 'Checklist task updated', variant: 'success' });
    },
    onError: (error) => {
      addToast({
        title: 'Unable to update checklist task',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!checklist?.id) {
        throw new Error('Checklist not found.');
      }

      const response = await fetch(`/api/onboarding/${checklist.id}/tasks`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to delete onboarding task' }));
        throw new Error(error.error || 'Failed to delete onboarding task');
      }

      return response.json();
    },
    onSuccess: async () => {
      setEditingTaskId(null);
      setTaskDraft(DEFAULT_TASK_DRAFT);
      await invalidateSelectedChecklist();
      addToast({ title: 'Checklist task removed', variant: 'success' });
    },
    onError: (error) => {
      addToast({
        title: 'Unable to remove checklist task',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    },
  });

  const clearChecklistMutation = useMutation({
    mutationFn: async () => {
      if (!checklist?.id) {
        throw new Error('Checklist not found.');
      }

      for (const task of checklist.onboarding_tasks) {
        const response = await fetch(`/api/onboarding/${checklist.id}/tasks`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id }),
        });

        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ error: 'Failed to delete onboarding task' }));
          throw new Error(error.error || 'Failed to delete onboarding task');
        }
      }
    },
    onSuccess: async () => {
      setEditingTaskId(null);
      setTaskDraft(DEFAULT_TASK_DRAFT);
      await invalidateSelectedChecklist();
      addToast({ title: 'Checklist cleared', variant: 'success' });
    },
    onError: (error) => {
      addToast({
        title: 'Unable to clear checklist',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async ({ tasks }: { tasks: Array<OnboardingTemplateTaskRecord> }) => {
      const response = await fetch(
        `/api/checklist-templates?flowType=onboarding&scope=${roleLabel}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks }),
        }
      );

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to save onboarding template' }));
        throw new Error(error.error || 'Failed to save onboarding template');
      }

      return response.json();
    },
    onSuccess: async () => {
      setEditingTaskId(null);
      setTaskDraft(DEFAULT_TASK_DRAFT);
      await invalidateTemplate();
    },
    onError: (error) => {
      addToast({
        title: 'Unable to save default checklist',
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
    tasks: Array<OnboardingTemplateTaskRecord>,
    successTitle: string
  ): Promise<void> => {
    await saveTemplateMutation.mutateAsync({ tasks });
    addToast({ title: successTitle, variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div className="space-y-2">
          <Label htmlFor={`onboarding-checklist-${roleLabel}`}>Manage {roleLabel} checklist</Label>
          <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
            <SelectTrigger id={`onboarding-checklist-${roleLabel}`}>
              <SelectValue placeholder={`Choose a ${roleLabel}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TEMPLATE_PROFILE_ID}>
                {`Default ${roleLabel} checklist template`}
              </SelectItem>
              {sortedProfiles.length > 0 ? (
                sortedProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-profiles" disabled>
                  No onboarding profiles available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {selectedProfile?.email_address ? (
            <p className="text-xs text-muted-foreground">{selectedProfile.email_address}</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {managingTemplate
                  ? `Default ${roleLabel} checklist template`
                  : selectedProfile?.full_name ?? 'No onboarding profile selected'}
              </p>
              <p className="text-sm text-muted-foreground">
                {managingTemplate
                  ? `Create the default ${roleLabel} checklist now. These items can be reused before a linked employee record exists.`
                  : wizardSummary.description}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={managingTemplate || !selectedProfile}
              onClick={() => {
                if (managingTemplate || !selectedProfile) {
                  return;
                }
                closeDialog?.();
                router.push(`/admin/onboarding/${selectedProfile.id}`);
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Wizard Form
            </Button>
          </div>
        </div>
      </div>

      {sortedProfiles.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-4">
            {!managingTemplate ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={wizardSummary.isComplete ? 'success' : 'secondary'}>
                      Item 1
                    </Badge>
                    <Badge variant="outline">Wizard form</Badge>
                    <Badge variant={wizardSummary.isComplete ? 'success' : 'warning'}>
                      {wizardSummary.statusLabel}
                    </Badge>
                  </div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    Complete onboarding wizard form
                  </p>
                  <p className="text-sm text-muted-foreground">{wizardSummary.description}</p>
                </div>
                {wizardSummary.isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <ClipboardList className="h-5 w-5 text-zinc-400" />
                )}
              </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {managingTemplate ? 'Default checklist items' : 'Admin-defined checklist items'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {managingTemplate
                      ? `These tasks will be available before a linked ${roleLabel} record exists.`
                      : `Edit or delete custom tasks for this ${roleLabel}.`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {displayedTasks.length > 0 ? (
                    <CountBadge variant="info" size="md">
                      {displayedTasks.length} {managingTemplate ? 'template task' : 'custom task'}
                      {displayedTasks.length === 1 ? '' : 's'}
                    </CountBadge>
                  ) : (
                    <CountBadge variant="warning" size="md">
                      {managingTemplate ? 'No default checklist yet' : 'No custom checklist yet'}
                    </CountBadge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={displayedTasks.length === 0 || clearChecklistMutation.isPending || saveTemplateMutation.isPending}
                    onClick={() => {
                      if (displayedTasks.length === 0) {
                        return;
                      }
                      if (
                        !confirm(
                          managingTemplate
                            ? `Delete the default ${roleLabel} checklist template?`
                            : `Delete all custom checklist items for ${selectedProfile?.full_name ?? 'this profile'}?`
                        )
                      ) {
                        return;
                      }
                      if (managingTemplate) {
                        void persistTemplateTasks([], 'Default checklist cleared');
                        return;
                      }
                      clearChecklistMutation.mutate();
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {managingTemplate ? 'Clear Template' : 'Delete Checklist'}
                  </Button>
                </div>
              </div>

              {managingTemplate ? templateQuery.isLoading : checklistQuery.isLoading ? (
                <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
                  <EmptyState
                    icon={<Loader2 className="h-5 w-5 animate-spin" />}
                    title="Loading checklist items"
                    description="Retrieving saved onboarding checklist tasks."
                    size="sm"
                  />
                </div>
              ) : managingTemplate && templateQuery.isError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                  <EmptyState
                    icon={AlertCircle}
                    title="Failed to load the default checklist template"
                    description="The saved onboarding template could not be retrieved."
                    size="sm"
                  />
                </div>
              ) : !managingTemplate && !selectedProfile?.employee_id ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300">
                  This profile is not linked to an employee record yet. You can still define the
                  default {roleLabel} checklist template from the selector above.
                </div>
              ) : !managingTemplate && checklistQuery.isError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                  <EmptyState
                    icon={AlertCircle}
                    title="Failed to load the onboarding checklist"
                    description="The checklist for this profile could not be retrieved."
                    size="sm"
                  />
                </div>
              ) : displayedTasks.length ? (
                <div className="space-y-3">
                  {displayedTasks.map((task, index) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <CountBadge variant="info" size="md">Item {index + 2}</CountBadge>
                            <Badge variant="outline">{task.category}</Badge>
                            <Badge variant={task.is_completed ? 'success' : 'warning'}>
                              {task.is_completed ? 'Completed' : 'Pending'}
                            </Badge>
                            {task.is_required ? <Badge variant="secondary">Required</Badge> : null}
                          </div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{task.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {task.description?.trim() || 'No description provided.'}
                          </p>
                          {task.requires_submission ? (
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline">
                                {formatSubmissionTypeLabel(task.submission_type ?? 'link_or_document')}
                              </Badge>
                              {task.submission_label ? (
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                  {task.submission_label}
                                </span>
                              ) : null}
                              {task.reference_url ? (
                                <a
                                  href={task.reference_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                                >
                                  Open reference
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                          {task.submission_description?.trim() ? (
                            <p className="text-xs text-muted-foreground">{task.submission_description}</p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            Due {task.due_days_from_start} day
                            {task.due_days_from_start === 1 ? '' : 's'} after start
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
                                dueDaysFromStart: String(task.due_days_from_start),
                                isRequired: task.is_required,
                                requiresSubmission: task.requires_submission === true,
                                submissionType: task.submission_type ?? 'none',
                                submissionLabel: task.submission_label ?? '',
                                submissionDescription: task.submission_description ?? '',
                                referenceUrl: task.reference_url ?? '',
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
                                  'Default checklist updated'
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
                    icon={ClipboardList}
                    title="No extra checklist items yet"
                    description="Custom onboarding items will appear here once they are added."
                    size="sm"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {editingTaskId
                    ? managingTemplate
                      ? 'Edit default checklist item'
                      : 'Edit checklist item'
                    : managingTemplate
                      ? 'Add default checklist item'
                      : 'Add checklist item'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {managingTemplate
                    ? `These tasks become the default ${roleLabel} checklist before any linked employee record exists.`
                    : 'These are the tasks the admin or super-admin controls beyond the wizard form.'}
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="space-y-2">
                  <Label htmlFor={`${roleLabel}-task-title`}>Title</Label>
                  <Input
                    id={`${roleLabel}-task-title`}
                    className="bg-white"
                    value={taskDraft.title}
                    onChange={(event) =>
                      setTaskDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Example: Submit signed NDA"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${roleLabel}-task-category`}>Category</Label>
                  <Input
                    id={`${roleLabel}-task-category`}
                    className="bg-white"
                    value={taskDraft.category}
                    onChange={(event) =>
                      setTaskDraft((current) => ({ ...current, category: event.target.value }))
                    }
                    placeholder="general"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${roleLabel}-task-description`}>Description</Label>
                <Textarea
                  id={`${roleLabel}-task-description`}
                  className="bg-white"
                  value={taskDraft.description}
                  onChange={(event) =>
                    setTaskDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Add guidance or what needs to be uploaded or completed."
                  rows={4}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${roleLabel}-task-due-days`}>Due days from start</Label>
                  <Input
                    id={`${roleLabel}-task-due-days`}
                    className="bg-white"
                    type="number"
                    min={1}
                    max={365}
                    value={taskDraft.dueDaysFromStart}
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        dueDaysFromStart: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    <Checkbox
                      checked={taskDraft.isRequired}
                      onCheckedChange={(checked) =>
                        setTaskDraft((current) => ({ ...current, isRequired: checked === true }))
                      }
                    />
                    Mark this item as required
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-zinc-500" />
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Link or document requirement
                      </h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Configure the proof this person needs to submit if the task depends on a
                      document upload or URL.
                    </p>
                  </div>

                  <label className="flex items-center gap-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    <Checkbox
                      checked={taskDraft.requiresSubmission}
                      onCheckedChange={(checked) =>
                        setTaskDraft((current) => ({
                          ...current,
                          requiresSubmission: checked === true,
                          submissionType:
                            checked === true && current.submissionType === 'none'
                              ? 'link_or_document'
                              : checked === true
                                ? current.submissionType
                                : 'none',
                        }))
                      }
                    />
                    Requires proof
                  </label>
                </div>

                {taskDraft.requiresSubmission ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`${roleLabel}-task-submission-type`}>Accepted proof</Label>
                        <Select
                          value={taskDraft.submissionType}
                          onValueChange={(value) =>
                            setTaskDraft((current) => ({
                              ...current,
                              submissionType: value as TaskDraft['submissionType'],
                            }))
                          }
                        >
                          <SelectTrigger
                            id={`${roleLabel}-task-submission-type`}
                            className="bg-white"
                          >
                            <SelectValue placeholder="Choose proof type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="link">Link only</SelectItem>
                            <SelectItem value="document">Document only</SelectItem>
                            <SelectItem value="link_or_document">Link or document</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`${roleLabel}-task-submission-label`}>Proof label</Label>
                        <Input
                          id={`${roleLabel}-task-submission-label`}
                          className="bg-white"
                          value={taskDraft.submissionLabel}
                          onChange={(event) =>
                            setTaskDraft((current) => ({
                              ...current,
                              submissionLabel: event.target.value,
                            }))
                          }
                          placeholder="Example: Signed NDA PDF or Drive link"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${roleLabel}-task-submission-description`}>
                        Submission guidance
                      </Label>
                      <Textarea
                        id={`${roleLabel}-task-submission-description`}
                        className="bg-white"
                        rows={3}
                        value={taskDraft.submissionDescription}
                        onChange={(event) =>
                          setTaskDraft((current) => ({
                            ...current,
                            submissionDescription: event.target.value,
                          }))
                        }
                        placeholder="Tell the assignee what to upload or which link to submit."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${roleLabel}-task-reference-url`}>Reference link</Label>
                      <div className="relative">
                        <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <Input
                          id={`${roleLabel}-task-reference-url`}
                          className="bg-white pl-9"
                          type="url"
                          value={taskDraft.referenceUrl}
                          onChange={(event) =>
                            setTaskDraft((current) => ({
                              ...current,
                              referenceUrl: event.target.value,
                            }))
                          }
                          placeholder="https://drive.google.com/..."
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Add a policy, template, folder, or destination link if the assignee
                        should start from a specific resource.
                      </p>
                    </div>

                    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-3 text-xs text-muted-foreground dark:border-zinc-700 dark:bg-zinc-950">
                      {formatSubmissionTypeLabel(taskDraft.submissionType)}
                      {taskDraft.submissionLabel ? ` • ${taskDraft.submissionLabel}` : ''}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={isSavingTask || (!managingTemplate && (!selectedProfile || !selectedProfile.employee_id))}
                  onClick={() => {
                    if (managingTemplate) {
                      const nextTask = buildTemplateTaskFromDraft(taskDraft, editingTaskId ?? undefined);
                      const nextTasks = editingTaskId
                        ? templateTasks.map((task) => (task.id === editingTaskId ? nextTask : task))
                        : [...templateTasks, nextTask];

                      void persistTemplateTasks(
                        nextTasks,
                        editingTaskId ? 'Default checklist updated' : 'Default checklist item added'
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
                  {editingTaskId ? 'Save changes' : 'Add checklist item'}
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
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-muted-foreground dark:border-zinc-700">
            No onboarding profiles exist yet. You can still define the default {roleLabel} checklist template now.
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {editingTaskId ? 'Edit default checklist item' : 'Add default checklist item'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Build the default {roleLabel} onboarding checklist before real records exist.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${roleLabel}-task-title-empty`}>Title</Label>
                <Input
                  id={`${roleLabel}-task-title-empty`}
                  className="bg-white"
                  value={taskDraft.title}
                  onChange={(event) =>
                    setTaskDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Example: Submit signed NDA"
                />
              </div>

              <Button
                disabled={isSavingTask}
                onClick={() => {
                  const nextTask = buildTemplateTaskFromDraft(taskDraft, editingTaskId ?? undefined);
                  const nextTasks = editingTaskId
                    ? templateTasks.map((task) => (task.id === editingTaskId ? nextTask : task))
                    : [...templateTasks, nextTask];

                  void persistTemplateTasks(
                    nextTasks,
                    editingTaskId ? 'Default checklist updated' : 'Default checklist item added'
                  );
                }}
              >
                {isSavingTask ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Save default template
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
