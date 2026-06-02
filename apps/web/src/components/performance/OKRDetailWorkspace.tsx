'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import {
  useCreateOKRTargetEvidence,
  useDeleteOKRTargetEvidence,
  useOKRTargetEvidence,
} from '@/hooks/useOKRTargetEvidence';
import {
  useCreateOKRTarget,
  useDeleteOKR,
  useDeleteOKRTarget,
  useMyPerformanceOKRs,
  useOKRTargets,
  usePerformanceCycles,
  useUpdateOKR,
  useUpdateOKRTarget,
} from '@/hooks/usePerformance';
import { usePerformanceRealtime } from '@/hooks/usePerformanceRealtime';
import type { OKR, OKRTarget, TargetMetricType } from '@hr-portal/ui';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  FileDropZone,
  Input,
  Label,
  Progress,
  RATING_CONFIG,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SlidePanel,
  SlidePanelBody,
  SlidePanelContent,
  SlidePanelDescription,
  SlidePanelFooter,
  SlidePanelHeader,
  SlidePanelSection,
  SlidePanelTitle,
  Textarea,
  type PerformanceRating,
  useToast,
} from '@hr-portal/ui';
import {
  ArrowLeft,
  Check,
  DollarSign,
  Download,
  Hash,
  ListChecks,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  SlidersHorizontal,
  Target,
  ToggleLeft,
  Trash2,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidEvidenceLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getProgressColor(value: number): string {
  if (value >= 80) return 'text-success';
  if (value >= 50) return 'text-warning';
  return 'text-error';
}

function getProgressBarColor(value: number): string {
  if (value >= 80) return 'bg-success';
  if (value >= 50) return 'bg-warning';
  return 'bg-error';
}

function formatRatingLabel(rating: PerformanceRating | undefined): string | null {
  if (!rating) {
    return null;
  }

  const config = RATING_CONFIG[rating];
  return `${config.label} (${config.score}/5)`;
}

function formatEvaluatorSummary(
  firstName: string | null | undefined,
  role: string | null | undefined,
  evaluatedAt: string | undefined
): string | null {
  const identity = [firstName?.trim(), role?.trim()].filter(Boolean).join(' · ');

  if (identity && evaluatedAt) {
    return `${identity} · ${formatDate(evaluatedAt)}`;
  }

  if (identity) {
    return identity;
  }

  if (evaluatedAt) {
    return formatDate(evaluatedAt);
  }

  return null;
}

const METRIC_TYPE_CONFIG: Record<
  TargetMetricType,
  { label: string; icon: typeof Hash; description: string; defaultUnit: string }
> = {
  number: {
    label: 'Number',
    icon: Hash,
    description: 'Track a numeric value (e.g., VP points, calls made)',
    defaultUnit: '',
  },
  boolean: {
    label: 'True / False',
    icon: ToggleLeft,
    description: 'Track completion of a task (done or not done)',
    defaultUnit: '',
  },
  currency: {
    label: 'Currency',
    icon: DollarSign,
    description: 'Track monetary amounts (e.g., revenue, cost savings)',
    defaultUnit: 'PHP',
  },
  tasks: {
    label: 'Tasks',
    icon: ListChecks,
    description: 'Track manual task count (e.g., completed items)',
    defaultUnit: 'tasks',
  },
  scale: {
    label: 'Scale (1–4)',
    icon: SlidersHorizontal,
    description: 'Rate on a 1–4 rubric scale with custom descriptors',
    defaultUnit: '',
  },
};

const PICKER_METRIC_TYPES = (
  Object.entries(METRIC_TYPE_CONFIG) as Array<
    [TargetMetricType, (typeof METRIC_TYPE_CONFIG)['number']]
  >
).filter(([type]) => type !== 'scale');

interface TargetFormState {
  name: string;
  description: string;
  metricType: TargetMetricType;
  startValue: string;
  targetValue: string;
  unit: string;
  weight: string;
}

interface ObjectiveFormState {
  objective: string;
  description: string;
  weight: string;
}

const emptyTargetForm: TargetFormState = {
  name: '',
  description: '',
  metricType: 'number',
  startValue: '0',
  targetValue: '100',
  unit: '',
  weight: '',
};

const emptyObjectiveForm: ObjectiveFormState = {
  objective: '',
  description: '',
  weight: '',
};

function targetFormForEdit(target: OKRTarget): TargetFormState {
  return {
    name: target.name,
    description: target.description || '',
    metricType: target.metricType,
    startValue: String(target.startValue),
    targetValue: String(target.targetValue),
    unit: target.unit || '',
    weight: String(target.weight),
  };
}

function objectiveFormForEdit(okr: OKR): ObjectiveFormState {
  return {
    objective: okr.objective,
    description: okr.description || '',
    weight: String(okr.weight),
  };
}

export interface OKRDetailWorkspaceProps {
  backPath: string;
  deleteRedirectPath: string;
}

export function OKRDetailWorkspace({
  backPath,
  deleteRedirectPath,
}: OKRDetailWorkspaceProps): ReactNode {
  usePerformanceRealtime();
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const handleBack = useBackNavigation({ fallbackPath: backPath });
  const router = useRouter();
  const { addToast } = useToast();

  const okrId = params.id;

  const { data: cycles = [] } = usePerformanceCycles();
  const { data: allOkrs = [] } = useMyPerformanceOKRs();
  const { data: targets = [], isLoading: targetsLoading } = useOKRTargets(okrId);

  const okr = allOkrs.find((objective) => objective.id === okrId);
  const cycle = cycles.find((cycle_) => cycle_.id === okr?.cycleId);

  const updateOKR = useUpdateOKR();
  const deleteOKR = useDeleteOKR();
  const createTarget = useCreateOKRTarget();
  const updateTarget = useUpdateOKRTarget();
  const deleteTarget = useDeleteOKRTarget();

  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [editingTarget, setEditingTarget] = useState<OKRTarget | null>(null);
  const [formState, setFormState] = useState<TargetFormState>(emptyTargetForm);
  const [objectiveEditorOpen, setObjectiveEditorOpen] = useState(false);
  const [objectiveFormState, setObjectiveFormState] =
    useState<ObjectiveFormState>(emptyObjectiveForm);
  const [objectiveDeleteOpen, setObjectiveDeleteOpen] = useState(false);
  const [progressTarget, setProgressTarget] = useState<OKRTarget | null>(null);
  const [progressValue, setProgressValue] = useState('');
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<Array<File>>([]);
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [evidenceLink, setEvidenceLink] = useState('');
  const { data: evidenceResponse, isLoading: evidenceLoading } = useOKRTargetEvidence(
    progressTarget?.id
  );
  const createEvidence = useCreateOKRTargetEvidence(progressTarget?.id || '');
  const deleteEvidence = useDeleteOKRTargetEvidence(progressTarget?.id || '');

  const usedWeight = useMemo(
    () =>
      targets
        .filter((target) => target.id !== editingTarget?.id)
        .reduce((sum, target) => sum + target.weight, 0),
    [targets, editingTarget]
  );
  const remainingWeight = Math.max(0, 100 - usedWeight);
  const remainingObjectiveWeight = useMemo(() => {
    if (!okr || !okr.cycleId || okr.cycleId === 'uncategorized') return 100;

    const siblingWeight = allOkrs
      .filter((objective) => objective.cycleId === okr.cycleId && objective.id !== okr.id)
      .reduce((sum, objective) => sum + objective.weight, 0);

    return Math.max(0, Math.round((100 - siblingWeight) * 100) / 100);
  }, [allOkrs, okr]);
  const objectiveWeightValue = Number(objectiveFormState.weight);
  const objectiveWeightInvalid =
    !objectiveFormState.weight ||
    objectiveWeightValue <= 0 ||
    objectiveWeightValue > remainingObjectiveWeight;

  const computedProgress = useMemo(() => {
    if (targets.length === 0) return 0;
    const totalWeight = targets.reduce((sum, target) => sum + target.weight, 0);
    if (totalWeight === 0) return 0;
    return Math.round(
      targets.reduce((sum, target) => sum + target.progressPercentage * target.weight, 0) /
        totalWeight
    );
  }, [targets]);
  const evidenceItems = evidenceResponse?.data || [];
  const objectiveRating = formatRatingLabel(okr?.adminRating);
  const evaluatorSummary = formatEvaluatorSummary(
    okr?.evaluatorFirstName,
    okr?.evaluatorRole,
    okr?.evaluatedAt
  );

  const handleOpenCreate = useCallback((): void => {
    const currentUsed = targets.reduce((sum, target) => sum + target.weight, 0);
    const autoWeight = Math.max(0, 100 - currentUsed);
    setFormState({ ...emptyTargetForm, weight: autoWeight > 0 ? String(autoWeight) : '' });
    setDialogMode('create');
    setEditingTarget(null);
  }, [targets]);

  const handleOpenEdit = useCallback((target: OKRTarget): void => {
    setFormState(targetFormForEdit(target));
    setEditingTarget(target);
    setDialogMode('edit');
  }, []);

  const handleCloseDialog = useCallback((): void => {
    setDialogMode(null);
    setEditingTarget(null);
    setFormState(emptyTargetForm);
  }, []);

  const handleOpenObjectiveEditor = useCallback((): void => {
    if (!okr) return;

    setObjectiveFormState(objectiveFormForEdit(okr));
    setObjectiveEditorOpen(true);
  }, [okr]);

  const handleCloseObjectiveEditor = useCallback((): void => {
    setObjectiveEditorOpen(false);
    setObjectiveFormState(emptyObjectiveForm);
  }, []);

  const handleMetricTypeChange = useCallback((type: TargetMetricType): void => {
    const config = METRIC_TYPE_CONFIG[type];
    setFormState((previous) => ({
      ...previous,
      metricType: type,
      unit: config.defaultUnit || previous.unit,
      startValue: type === 'boolean' ? '0' : previous.startValue,
      targetValue: type === 'boolean' ? '1' : previous.targetValue,
    }));
  }, []);

  const handleSaveTarget = async (): Promise<void> => {
    if (!formState.name.trim()) return;

    try {
      if (dialogMode === 'create') {
        const payload: Parameters<typeof createTarget.mutateAsync>[0] = {
          okrId,
          name: formState.name.trim(),
          metricType: formState.metricType,
          targetValue: Number(formState.targetValue) || 1,
          startValue: Number(formState.startValue) || 0,
          weight: Number(formState.weight) || 1,
        };
        const description = formState.description.trim();
        if (description) payload.description = description;
        const unit = formState.unit.trim();
        if (unit) payload.unit = unit;
        await createTarget.mutateAsync(payload);
        addToast({ title: 'Target created', variant: 'success' });
      } else if (dialogMode === 'edit' && editingTarget) {
        const payload: Parameters<typeof updateTarget.mutateAsync>[0] = {
          id: editingTarget.id,
          okrId,
          name: formState.name.trim(),
          metricType: formState.metricType,
          startValue: Number(formState.startValue) || 0,
          targetValue: Number(formState.targetValue) || 1,
          weight: Number(formState.weight) || 1,
        };
        const description = formState.description.trim();
        if (description) payload.description = description;
        const unit = formState.unit.trim();
        if (unit) payload.unit = unit;
        await updateTarget.mutateAsync(payload);
        addToast({ title: 'Target updated', variant: 'success' });
      }
      handleCloseDialog();
    } catch {
      addToast({ title: 'Error saving target', variant: 'error' });
    }
  };

  const handleDeleteTarget = async (target: OKRTarget): Promise<void> => {
    try {
      await deleteTarget.mutateAsync({ id: target.id, okrId });
      addToast({ title: 'Target removed', variant: 'success' });
    } catch {
      addToast({ title: 'Error removing target', variant: 'error' });
    }
  };

  const handleCloseProgressDialog = useCallback((): void => {
    setProgressTarget(null);
    setProgressValue('');
    setSelectedEvidenceFiles([]);
    setEvidenceLabel('');
    setEvidenceLink('');
  }, []);

  const handleUploadEvidence = async (): Promise<void> => {
    if (!progressTarget || selectedEvidenceFiles.length === 0) return;

    const file = selectedEvidenceFiles[0];
    if (!file) return;

    try {
      await createEvidence.mutateAsync({
        file,
        ...(evidenceLabel.trim() ? { label: evidenceLabel.trim() } : {}),
      });
      addToast({ title: 'Evidence uploaded', variant: 'success' });
      setSelectedEvidenceFiles([]);
      setEvidenceLabel('');
    } catch (error) {
      addToast({
        title: 'Error uploading evidence',
        description: error instanceof Error ? error.message : 'Failed to upload evidence',
        variant: 'error',
      });
    }
  };

  const handleDeleteEvidence = async (evidenceId: string): Promise<void> => {
    try {
      await deleteEvidence.mutateAsync(evidenceId);
      addToast({ title: 'Evidence removed', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Error removing evidence',
        description: error instanceof Error ? error.message : 'Failed to remove evidence',
        variant: 'error',
      });
    }
  };

  const handleAddEvidenceLink = async (): Promise<void> => {
    const link = evidenceLink.trim();
    if (!link) return;

    if (!isValidEvidenceLink(link)) {
      addToast({
        title: 'Invalid link',
        description: 'Enter a valid http or https link before attaching it.',
        variant: 'error',
      });
      return;
    }

    try {
      await createEvidence.mutateAsync({
        evidenceType: 'link',
        content: link,
        ...(evidenceLabel.trim() ? { label: evidenceLabel.trim() } : {}),
      });
      addToast({ title: 'Link attached', variant: 'success' });
      setEvidenceLink('');
      setEvidenceLabel('');
    } catch (error) {
      addToast({
        title: 'Error attaching link',
        description: error instanceof Error ? error.message : 'Failed to attach link',
        variant: 'error',
      });
    }
  };

  const handleUpdateProgress = async (): Promise<void> => {
    if (!progressTarget) return;

    try {
      const hasStoredEvidence = evidenceItems.length > 0;

      if (!hasStoredEvidence) {
        const file = selectedEvidenceFiles[0];
        const link = evidenceLink.trim();

        if (file) {
          await createEvidence.mutateAsync({
            file,
            ...(evidenceLabel.trim() ? { label: evidenceLabel.trim() } : {}),
          });
          setSelectedEvidenceFiles([]);
          setEvidenceLabel('');
        } else if (link) {
          if (!isValidEvidenceLink(link)) {
            addToast({
              title: 'Invalid link',
              description: 'Enter a valid http or https link before updating progress.',
              variant: 'error',
            });
            return;
          }

          await createEvidence.mutateAsync({
            evidenceType: 'link',
            content: link,
            ...(evidenceLabel.trim() ? { label: evidenceLabel.trim() } : {}),
          });
          setEvidenceLink('');
          setEvidenceLabel('');
        } else {
          addToast({
            title: 'Supporting attachment required',
            description: 'Add at least one supporting attachment or link before updating progress.',
            variant: 'error',
          });
          return;
        }
      }

      const newValue =
        progressTarget.metricType === 'boolean'
          ? progressTarget.currentValue === 0
            ? 1
            : 0
          : Number(progressValue);
      await updateTarget.mutateAsync({
        id: progressTarget.id,
        okrId,
        currentValue: newValue,
      });
      addToast({ title: 'Progress updated', variant: 'success' });
      handleCloseProgressDialog();
    } catch {
      addToast({ title: 'Error updating progress', variant: 'error' });
    }
  };

  const handleMarkComplete = async (): Promise<void> => {
    try {
      await updateOKR.mutateAsync({ id: okrId, status: 'completed' });
      addToast({ title: 'Objective marked as completed', variant: 'success' });
    } catch {
      addToast({ title: 'Error updating objective', variant: 'error' });
    }
  };

  const handleSaveObjective = async (): Promise<void> => {
    if (!okr || !objectiveFormState.objective.trim() || objectiveWeightInvalid) return;

    try {
      await updateOKR.mutateAsync({
        id: okr.id,
        objective: objectiveFormState.objective.trim(),
        description: objectiveFormState.description.trim(),
        weight: objectiveWeightValue,
      });
      addToast({ title: 'Objective updated', variant: 'success' });
      handleCloseObjectiveEditor();
    } catch {
      addToast({ title: 'Error updating objective', variant: 'error' });
    }
  };

  const handleDeleteObjective = async (): Promise<void> => {
    if (!okr) return;

    try {
      await deleteOKR.mutateAsync({ id: okr.id });
      addToast({ title: 'Objective deleted', variant: 'success' });
      setObjectiveDeleteOpen(false);
      router.push(deleteRedirectPath);
    } catch {
      addToast({ title: 'Error deleting objective', variant: 'error' });
    }
  };

  if (!okr) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to OKRs & KPIs
        </button>
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Objective not found</h3>
            <p className="text-muted-foreground">
              This objective may have been removed or you don&apos;t have access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to OKRs & KPIs
      </button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold text-foreground">{okr.objective}</h1>
                  {okr.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{okr.description}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    okr.status === 'completed'
                      ? 'success'
                      : okr.status === 'in_progress'
                        ? 'warning'
                        : 'secondary'
                  }
                >
                  {okr.status === 'in_progress'
                    ? 'In Progress'
                    : okr.status.charAt(0).toUpperCase() + okr.status.slice(1)}
                </Badge>
                {cycle && <Badge variant="outline">{cycle.name}</Badge>}
                <span className="text-xs text-muted-foreground">
                  Weight: {okr.weight}% &middot; Created {formatDate(okr.createdAt)}
                </span>
              </div>

              {(objectiveRating || okr.adminComments) && (
                <div className="mt-4 rounded-lg border border-primary/15 bg-primary/5 p-3">
                  <p className="text-sm font-medium text-primary">
                    {objectiveRating ? `Admin feedback: ${objectiveRating}` : 'Admin feedback'}
                  </p>
                  {evaluatorSummary && (
                    <p className="mt-1 text-xs text-muted-foreground">Reviewed by {evaluatorSummary}</p>
                  )}
                  {okr.adminComments && (
                    <p className="mt-2 text-sm text-muted-foreground">{okr.adminComments}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="relative h-20 w-20">
                <svg
                  className="h-20 w-20 -rotate-90"
                  viewBox="0 0 80 80"
                  aria-labelledby="objective-progress-title"
                  role="img"
                >
                  <title id="objective-progress-title">Objective progress</title>
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-muted/30"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeDasharray={`${(computedProgress / 100) * 213.6} 213.6`}
                    strokeLinecap="round"
                    className={getProgressColor(computedProgress)}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{computedProgress}%</span>
                </div>
              </div>

              {okr.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleMarkComplete()}
                  disabled={updateOKR.isPending}
                >
                  {updateOKR.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-4 w-4" />
                  )}
                  Complete
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon-sm" className="shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleOpenObjectiveEditor}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Objective
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setObjectiveDeleteOpen(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Objective
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <SlidePanel open={objectiveEditorOpen} onOpenChange={setObjectiveEditorOpen}>
        <SlidePanelContent size="lg">
          <SlidePanelHeader>
            <SlidePanelTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              Edit Objective
            </SlidePanelTitle>
            <SlidePanelDescription>
              Update the objective title, supporting context, and weight allocation.
            </SlidePanelDescription>
          </SlidePanelHeader>

          <SlidePanelBody className="space-y-6">
            <SlidePanelSection label="Objective">
              <div className="space-y-1.5">
                <Label htmlFor="objective-name" className="text-sm font-medium">
                  Objective name
                </Label>
                <Input
                  id="objective-name"
                  value={objectiveFormState.objective}
                  onChange={(event) =>
                    setObjectiveFormState((previous) => ({
                      ...previous,
                      objective: event.target.value,
                    }))
                  }
                  placeholder="Describe the outcome you want to achieve"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="objective-description" className="text-sm font-medium">
                  Description
                  <span className="ml-1 text-xs font-normal text-muted-foreground">Optional</span>
                </Label>
                <Textarea
                  id="objective-description"
                  value={objectiveFormState.description}
                  onChange={(event) =>
                    setObjectiveFormState((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Add context for collaborators and reviewers"
                  className="min-h-[88px] resize-none"
                />
              </div>
            </SlidePanelSection>

            <SlidePanelSection label="Priority">
              <div className="space-y-1.5">
                <Label htmlFor="objective-weight" className="text-sm font-medium">
                  Weight
                </Label>
                <div className="relative">
                  <Input
                    id="objective-weight"
                    type="number"
                    min="1"
                    max={remainingObjectiveWeight}
                    step="1"
                    value={objectiveFormState.weight}
                    onChange={(event) =>
                      setObjectiveFormState((previous) => ({
                        ...previous,
                        weight: event.target.value,
                      }))
                    }
                    className="pr-8"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                <p
                  className={`text-xs ${objectiveWeightInvalid ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  {remainingObjectiveWeight <= 0
                    ? '100% is already allocated across the other objectives in this cycle.'
                    : `${remainingObjectiveWeight}% is available for this objective within the current cycle.`}
                </p>
              </div>
            </SlidePanelSection>
          </SlidePanelBody>

          <SlidePanelFooter>
            <Button variant="outline" onClick={handleCloseObjectiveEditor}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveObjective()}
              disabled={
                !objectiveFormState.objective.trim() ||
                objectiveWeightInvalid ||
                updateOKR.isPending
              }
            >
              {updateOKR.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </SlidePanelFooter>
        </SlidePanelContent>
      </SlidePanel>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ListChecks className="h-5 w-5" />
              Targets &amp; KPIs
            </h2>
            <p className="text-sm text-muted-foreground">
              {targets.length} target{targets.length !== 1 ? 's' : ''} contributing to this
              objective
            </p>
          </div>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Add Target
          </Button>
        </div>

        {targetsLoading ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Loading targets...
            </CardContent>
          </Card>
        ) : targets.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <EmptyState
                icon={ListChecks}
                title="No targets yet"
                description="Add targets to track specific metrics for this objective. Choose from Number, True/False, Currency, or Tasks."
                action={{
                  label: 'Add First Target',
                  onClick: handleOpenCreate,
                  icon: <Plus className="h-3.5 w-3.5" />,
                }}
                size="sm"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {targets.map((target) => (
              <TargetCard
                key={target.id}
                target={target}
                onEdit={() => handleOpenEdit(target)}
                onDelete={() => void handleDeleteTarget(target)}
                onUpdateProgress={() => {
                  setProgressTarget(target);
                  setProgressValue(String(target.currentValue));
                }}
              />
            ))}
          </div>
        )}
      </div>

      <SlidePanel open={dialogMode !== null} onOpenChange={() => handleCloseDialog()}>
        <SlidePanelContent size="2xl">
          <SlidePanelHeader>
            <SlidePanelTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              {dialogMode === 'create' ? 'Add New Target' : 'Edit Target'}
            </SlidePanelTitle>
            <SlidePanelDescription>
              {dialogMode === 'create'
                ? 'Define a measurable target that contributes to this objective.'
                : 'Update the details and tracking configuration for this target.'}
            </SlidePanelDescription>
          </SlidePanelHeader>

          <SlidePanelBody className="space-y-6">
            <SlidePanelSection label="How will you track this?">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PICKER_METRIC_TYPES.map(([type, config]) => {
                  const Icon = config.icon;
                  const isSelected = formState.metricType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleMetricTypeChange(type)}
                      className={`flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-zinc-200 hover:border-primary/30 dark:border-zinc-800'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{config.label}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </SlidePanelSection>

            <SlidePanelSection label="What are you measuring?">
              <div className="space-y-1.5">
                <Label htmlFor="target-name" className="text-sm font-medium">
                  Target Name
                </Label>
                <Input
                  id="target-name"
                  placeholder={
                    formState.metricType === 'number'
                      ? 'e.g., Monthly VP points earned'
                      : formState.metricType === 'boolean'
                        ? 'e.g., Complete onboarding certification'
                        : formState.metricType === 'currency'
                          ? 'e.g., Monthly revenue generated'
                          : 'e.g., Client deliverables completed'
                  }
                  value={formState.name}
                  onChange={(event) => setFormState({ ...formState, name: event.target.value })}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target-desc" className="text-sm font-medium">
                  Description
                  <span className="ml-1 text-xs font-normal text-muted-foreground">Optional</span>
                </Label>
                <Textarea
                  id="target-desc"
                  placeholder="Add context about how this target should be tracked or why it matters..."
                  value={formState.description}
                  onChange={(event) =>
                    setFormState({ ...formState, description: event.target.value })
                  }
                  className="min-h-[72px] resize-none"
                />
              </div>
            </SlidePanelSection>

            {formState.metricType !== 'boolean' ? (
              <SlidePanelSection label="Values">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="start-value" className="text-sm font-medium">
                      Starting at
                    </Label>
                    <Input
                      id="start-value"
                      type="number"
                      placeholder="0"
                      value={formState.startValue}
                      onChange={(event) =>
                        setFormState({ ...formState, startValue: event.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Reference value for planning</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="target-value" className="text-sm font-medium">
                      Goal
                    </Label>
                    <Input
                      id="target-value"
                      type="number"
                      placeholder="100"
                      value={formState.targetValue}
                      onChange={(event) =>
                        setFormState({ ...formState, targetValue: event.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Target to reach by the cycle deadline
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="unit" className="text-sm font-medium">
                      Unit of measurement
                    </Label>
                    <Select
                      value={formState.unit || 'none'}
                      onValueChange={(value) =>
                        setFormState({ ...formState, unit: value === 'none' ? '' : value })
                      }
                    >
                      <SelectTrigger id="unit">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="points">Points</SelectItem>
                        <SelectItem value="tasks">Tasks</SelectItem>
                        <SelectItem value="PHP">PHP</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="items">Items</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="target-weight" className="text-sm font-medium">
                      Weight
                    </Label>
                    <div className="relative">
                      <Input
                        id="target-weight"
                        type="number"
                        min="1"
                        max={remainingWeight}
                        step="1"
                        placeholder={remainingWeight > 0 ? String(remainingWeight) : '0'}
                        value={formState.weight}
                        onChange={(event) =>
                          setFormState({ ...formState, weight: event.target.value })
                        }
                        className="pr-8"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                    <p
                      className={`text-xs ${formState.weight !== '' && Number(formState.weight) > remainingWeight ? 'text-destructive' : 'text-muted-foreground'}`}
                    >
                      {remainingWeight <= 0
                        ? '100% already allocated'
                        : `${remainingWeight}% available`}
                    </p>
                  </div>
                </div>
              </SlidePanelSection>
            ) : (
              <SlidePanelSection label="Tracking">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800">
                  <div className="flex items-center gap-3">
                    <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Done / Not Done</p>
                      <p className="text-xs text-muted-foreground">
                        This target tracks simple completion — progress is either 0% or 100%.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="target-weight" className="text-sm font-medium">
                    Weight
                  </Label>
                  <div className="relative">
                    <Input
                      id="target-weight"
                      type="number"
                      min="1"
                      max={remainingWeight}
                      step="1"
                      placeholder={remainingWeight > 0 ? String(remainingWeight) : '0'}
                      value={formState.weight}
                      onChange={(event) =>
                        setFormState({ ...formState, weight: event.target.value })
                      }
                      className="pr-8"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                  <p
                    className={`text-xs ${formState.weight !== '' && Number(formState.weight) > remainingWeight ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    {remainingWeight <= 0
                      ? '100% already allocated'
                      : `${remainingWeight}% available`}
                  </p>
                </div>
              </SlidePanelSection>
            )}
          </SlidePanelBody>

          <SlidePanelFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveTarget()}
              disabled={
                !formState.name.trim() ||
                !formState.weight ||
                Number(formState.weight) <= 0 ||
                Number(formState.weight) > remainingWeight ||
                createTarget.isPending ||
                updateTarget.isPending
              }
            >
              {createTarget.isPending || updateTarget.isPending
                ? 'Saving...'
                : dialogMode === 'create'
                  ? 'Add Target'
                  : 'Save Changes'}
            </Button>
          </SlidePanelFooter>
        </SlidePanelContent>
      </SlidePanel>

      <Dialog open={progressTarget !== null} onOpenChange={handleCloseProgressDialog}>
        <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden p-0 sm:max-w-[560px]">
          <DialogHeader className="px-6 pb-4 pt-6">
            <DialogTitle>Update Progress</DialogTitle>
            <DialogDescription>{progressTarget?.name}</DialogDescription>
          </DialogHeader>
          {progressTarget && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {progressTarget.metricType === 'boolean' ? (
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                    <span className="font-medium">
                      {progressTarget.currentValue === 0 ? 'Not completed' : 'Completed'}
                    </span>
                    <Button
                      size="sm"
                      variant={progressTarget.currentValue === 0 ? 'default' : 'outline'}
                      onClick={() => void handleUpdateProgress()}
                    >
                      {progressTarget.currentValue === 0 ? 'Mark Done' : 'Mark Undone'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Target: {progressTarget.targetValue}
                        {progressTarget.unit ? ` ${progressTarget.unit}` : ''}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="progress-val">Current Value</Label>
                      <Input
                        id="progress-val"
                        type="number"
                        value={progressValue}
                        onChange={(event) => setProgressValue(event.target.value)}
                      />
                    </div>
                    <Progress
                      value={
                        progressTarget.targetValue > 0
                          ? Math.min(
                              (Number(progressValue) / progressTarget.targetValue) * 100,
                              100
                            )
                          : 0
                      }
                      className="h-2"
                    />
                  </div>
                )}

                <div className="space-y-3 border-t pt-2">
                  <div>
                    <p className="text-sm font-medium">Evidence / Proof</p>
                    <p className="text-xs text-muted-foreground">
                      Attach at least one supporting file or link before you update progress.
                    </p>
                  </div>

                  {evidenceLoading ? (
                    <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                      Loading evidence...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {evidenceItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="truncate text-sm font-medium">
                              {item.label || item.file_name || 'Evidence attachment'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.file_name || item.content}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.submitted_by_name} • {formatDate(item.created_at)}
                              {item.file_size ? ` • ${formatFileSize(item.file_size)}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {(item.download_url || item.evidence_type === 'link') && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(
                                    item.download_url || item.content,
                                    '_blank',
                                    'noopener,noreferrer'
                                  )
                                }
                              >
                                <Download className="mr-1 h-3.5 w-3.5" />
                                View
                              </Button>
                            )}
                            {item.submitted_by === user?.id && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => void handleDeleteEvidence(item.id)}
                                disabled={deleteEvidence.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 rounded-lg border border-border p-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="evidence-label">Label</Label>
                      <Input
                        id="evidence-label"
                        value={evidenceLabel}
                        onChange={(event) => setEvidenceLabel(event.target.value)}
                        placeholder="Optional note about this attachment"
                        maxLength={1000}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="evidence-link">Supporting Link</Label>
                      <div className="flex gap-2">
                        <Input
                          id="evidence-link"
                          value={evidenceLink}
                          onChange={(event) => setEvidenceLink(event.target.value)}
                          placeholder="https://example.com/supporting-proof"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleAddEvidenceLink()}
                          disabled={!evidenceLink.trim() || createEvidence.isPending}
                        >
                          Add Link
                        </Button>
                      </div>
                    </div>

                    <FileDropZone
                      onFilesSelected={(files) => setSelectedEvidenceFiles(files.slice(0, 1))}
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      multiple={false}
                      maxFiles={1}
                      maxSizeMB={10}
                      compact
                      selectedFiles={selectedEvidenceFiles}
                      onRemoveFile={(index) => {
                        setSelectedEvidenceFiles((previous) =>
                          previous.filter((_, fileIndex) => fileIndex !== index)
                        );
                      }}
                      isUploading={createEvidence.isPending}
                      formatHint="PNG, JPG, GIF, WEBP, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX - max 10 MB"
                    />

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleUploadEvidence()}
                        disabled={selectedEvidenceFiles.length === 0 || createEvidence.isPending}
                      >
                        {createEvidence.isPending ? 'Uploading...' : 'Upload Evidence'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="border-t px-6 pb-6 pt-4">
            <Button variant="outline" onClick={handleCloseProgressDialog}>
              Cancel
            </Button>
            <Button onClick={() => void handleUpdateProgress()} disabled={updateTarget.isPending}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={objectiveDeleteOpen} onOpenChange={setObjectiveDeleteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete objective?</DialogTitle>
            <DialogDescription>
              This will remove the objective and all of its targets from your OKRs & KPIs workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-muted-foreground">
            <p>
              This action cannot be undone. Reviewers will no longer see this objective once it is
              deleted.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObjectiveDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteObjective()}
              disabled={deleteOKR.isPending}
            >
              {deleteOKR.isPending ? 'Deleting...' : 'Delete Objective'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TargetCardProps {
  target: OKRTarget;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateProgress: () => void;
}

function TargetCard({ target, onEdit, onDelete, onUpdateProgress }: TargetCardProps): ReactNode {
  const config = METRIC_TYPE_CONFIG[target.metricType];
  const Icon = config.icon;
  const displayValue =
    target.metricType === 'boolean'
      ? target.currentValue === 1
        ? 'Done'
        : 'Not Done'
      : target.metricType === 'currency'
        ? `${target.unit || 'PHP'} ${target.currentValue.toLocaleString()} / ${target.targetValue.toLocaleString()}`
        : `${target.currentValue} / ${target.targetValue}${target.unit ? ` ${target.unit}` : ''}`;

  return (
    <Card className="transition-shadow hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${target.progressPercentage >= 100 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
          >
            {target.progressPercentage >= 100 ? (
              <Check className="h-5 w-5" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="truncate font-medium text-foreground">{target.name}</h4>
                {target.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                    {target.description}
                  </p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onUpdateProgress}>
                    <Hash className="mr-2 h-4 w-4" />
                    Update Progress
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Target
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <Progress
                  value={Math.min(target.progressPercentage, 100)}
                  className="h-2"
                  indicatorClassName={getProgressBarColor(target.progressPercentage)}
                />
              </div>
              <span
                className={`min-w-[3rem] text-right text-sm font-semibold ${getProgressColor(target.progressPercentage)}`}
              >
                {target.progressPercentage}%
              </span>
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="outline" className="h-5 text-xs">
                {config.label}
              </Badge>
              <span>{displayValue}</span>
              <span className="ml-auto">Weight: {target.weight}%</span>
            </div>

            {(target.adminRating || target.adminComments) && (
              <div className="mt-2 rounded border border-primary/10 bg-primary/5 p-2">
                {target.adminRating && (
                  <p className="text-xs font-medium text-primary">
                    Admin Rating: {formatRatingLabel(target.adminRating) ?? target.adminRating}
                  </p>
                )}
                {target.adminComments && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{target.adminComments}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
