'use client';

import {
  useCreateOKRTarget,
  useDeleteOKR,
  useDeleteOKRTarget,
  useOKRTargets,
  usePerformanceCycles,
  usePerformanceOKRs,
  useUpdateOKR,
  useUpdateOKRTarget,
} from '@/hooks/usePerformance';
import { useBackNavigation } from '@/hooks/useBackNavigation';
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
  Input,
  Label,
  Progress,
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
  useToast,
} from '@hr-portal/ui';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  DollarSign,
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

// =============================================
// Helpers
// =============================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

/** Only legacy metric types shown in the picker — 'scale' is internal-only */
const PICKER_METRIC_TYPES = (
  Object.entries(METRIC_TYPE_CONFIG) as Array<
    [TargetMetricType, (typeof METRIC_TYPE_CONFIG)['number']]
  >
).filter(([type]) => type !== 'scale');

// =============================================
// Target Form State
// =============================================

interface TargetFormState {
  name: string;
  description: string;
  metricType: TargetMetricType;
  startValue: string;
  targetValue: string;
  currentValue: string;
  unit: string;
  weight: string;
  rubric1: string;
  rubric2: string;
  rubric3: string;
  rubric4: string;
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
  currentValue: '0',
  unit: '',
  weight: '',
  rubric1: '',
  rubric2: '',
  rubric3: '',
  rubric4: '',
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
    currentValue: String(target.currentValue),
    unit: target.unit || '',
    weight: String(target.weight),
    rubric1: target.rubric1 || '',
    rubric2: target.rubric2 || '',
    rubric3: target.rubric3 || '',
    rubric4: target.rubric4 || '',
  };
}

function objectiveFormForEdit(okr: OKR): ObjectiveFormState {
  return {
    objective: okr.objective,
    description: okr.description || '',
    weight: String(okr.weight),
  };
}

// =============================================
// Component
// =============================================

export default function OKRDetailPage(): ReactNode {
  usePerformanceRealtime();
  const params = useParams<{ id: string }>();
  const handleBack = useBackNavigation({ fallbackPath: '/performance' });
  const router = useRouter();
  const { addToast } = useToast();

  const okrId = params.id;

  const { data: cycles = [] } = usePerformanceCycles();
  const { data: allOkrs = [] } = usePerformanceOKRs();
  const { data: targets = [], isLoading: targetsLoading } = useOKRTargets(okrId);

  const okr = allOkrs.find((o) => o.id === okrId);
  const cycle = cycles.find((c) => c.id === okr?.cycleId);

  const updateOKR = useUpdateOKR();
  const deleteOKR = useDeleteOKR();
  const createTarget = useCreateOKRTarget();
  const updateTarget = useUpdateOKRTarget();
  const deleteTarget = useDeleteOKRTarget();

  // Dialog state
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [editingTarget, setEditingTarget] = useState<OKRTarget | null>(null);
  const [formState, setFormState] = useState<TargetFormState>(emptyTargetForm);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [objectiveEditorOpen, setObjectiveEditorOpen] = useState(false);
  const [objectiveFormState, setObjectiveFormState] =
    useState<ObjectiveFormState>(emptyObjectiveForm);
  const [objectiveDeleteOpen, setObjectiveDeleteOpen] = useState(false);

  // Update progress dialog
  const [progressTarget, setProgressTarget] = useState<OKRTarget | null>(null);
  const [progressValue, setProgressValue] = useState('');
  const [progressSelfRating, setProgressSelfRating] = useState<number | null>(null);

  // Computed: weight already allocated by other targets (excluding the one being edited)
  const usedWeight = useMemo(
    () => targets.filter((t) => t.id !== editingTarget?.id).reduce((sum, t) => sum + t.weight, 0),
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

  // Computed: weighted progress from targets
  const computedProgress = useMemo(() => {
    if (targets.length === 0) return 0;
    const totalWeight = targets.reduce((sum, t) => sum + t.weight, 0);
    if (totalWeight === 0) return 0;
    return Math.round(
      targets.reduce((sum, t) => sum + t.progressPercentage * t.weight, 0) / totalWeight
    );
  }, [targets]);

  // Handlers
  const handleOpenCreate = useCallback((): void => {
    const currentUsed = targets.reduce((sum, t) => sum + t.weight, 0);
    const autoWeight = Math.max(0, 100 - currentUsed);
    setFormState({ ...emptyTargetForm, weight: autoWeight > 0 ? String(autoWeight) : '' });
    setFormStep(1);
    setDialogMode('create');
    setEditingTarget(null);
  }, [targets]);

  const handleOpenEdit = useCallback((target: OKRTarget): void => {
    setFormState(targetFormForEdit(target));
    setFormStep(1);
    setEditingTarget(target);
    setDialogMode('edit');
  }, []);

  const handleCloseDialog = useCallback((): void => {
    setDialogMode(null);
    setEditingTarget(null);
    setFormState(emptyTargetForm);
    setFormStep(1);
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
    setFormState((prev) => ({
      ...prev,
      metricType: type,
      unit: config.defaultUnit || prev.unit,
      startValue: type === 'boolean' ? '0' : prev.startValue,
      targetValue: type === 'boolean' ? '1' : prev.targetValue,
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
          currentValue: Number(formState.currentValue) || 0,
          weight: Number(formState.weight) || 1,
        };
        const desc = formState.description.trim();
        if (desc) payload.description = desc;
        const unit = formState.unit.trim();
        if (unit) payload.unit = unit;
        if (formState.rubric1.trim()) payload.rubric1 = formState.rubric1.trim();
        if (formState.rubric2.trim()) payload.rubric2 = formState.rubric2.trim();
        if (formState.rubric3.trim()) payload.rubric3 = formState.rubric3.trim();
        if (formState.rubric4.trim()) payload.rubric4 = formState.rubric4.trim();
        await createTarget.mutateAsync(payload);
        addToast({ title: 'Target created', variant: 'success' });
      } else if (dialogMode === 'edit' && editingTarget) {
        const updatePayload: Parameters<typeof updateTarget.mutateAsync>[0] = {
          id: editingTarget.id,
          okrId,
          name: formState.name.trim(),
          metricType: formState.metricType,
          startValue: Number(formState.startValue) || 0,
          targetValue: Number(formState.targetValue) || 1,
          currentValue: Number(formState.currentValue) || 0,
          weight: Number(formState.weight) || 1,
        };
        const editDesc = formState.description.trim();
        if (editDesc) updatePayload.description = editDesc;
        const editUnit = formState.unit.trim();
        if (editUnit) updatePayload.unit = editUnit;
        if (formState.rubric1.trim()) updatePayload.rubric1 = formState.rubric1.trim();
        if (formState.rubric2.trim()) updatePayload.rubric2 = formState.rubric2.trim();
        if (formState.rubric3.trim()) updatePayload.rubric3 = formState.rubric3.trim();
        if (formState.rubric4.trim()) updatePayload.rubric4 = formState.rubric4.trim();
        await updateTarget.mutateAsync(updatePayload);
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

  const handleUpdateProgress = async (): Promise<void> => {
    if (!progressTarget) return;

    try {
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
        ...(progressSelfRating ? { selfRating: progressSelfRating } : {}),
      });
      addToast({ title: 'Progress updated', variant: 'success' });
      setProgressTarget(null);
      setProgressValue('');
      setProgressSelfRating(null);
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
      router.push('/performance');
    } catch {
      addToast({ title: 'Error deleting objective', variant: 'error' });
    }
  };

  // =============================================
  // Render
  // =============================================

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
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Objective not found</h3>
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
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to OKRs & KPIs
      </button>

      {/* Objective Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-foreground truncate">{okr.objective}</h1>
                  {okr.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{okr.description}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
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
            </div>

            {/* Progress circle */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative h-20 w-20">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
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
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    Optional
                  </span>
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
                  className={`text-xs ${
                    objectiveWeightInvalid ? 'text-destructive' : 'text-muted-foreground'
                  }`}
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

      {/* Targets Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
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
                  setProgressSelfRating(target.selfRating || null);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Target — Slide Panel */}
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
              {formStep === 1
                ? dialogMode === 'create'
                  ? 'Define a measurable target that contributes to this objective.'
                  : 'Update the details and tracking configuration for this target.'
                : 'Describe what each rating level (1–4) means for this target.'}
            </SlidePanelDescription>
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className={`h-1 flex-1 rounded-full transition-colors ${formStep >= 1 ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'}`}
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {formStep} / 2
              </span>
              <div
                className={`h-1 flex-1 rounded-full transition-colors ${formStep >= 2 ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'}`}
              />
            </div>
          </SlidePanelHeader>

          <SlidePanelBody className="space-y-6">
            {formStep === 1 ? (
              <>
                {/* ── Metric Type ────────────────────────────── */}
                <SlidePanelSection label="How will you track this?">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PICKER_METRIC_TYPES.map(([type, config]) => {
                      const Icon = config.icon;
                      const isSelected = formState.metricType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleMetricTypeChange(type)}
                          className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-zinc-200 hover:border-primary/30 dark:border-zinc-800'
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-md shrink-0 ${
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{config.label}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {config.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </SlidePanelSection>

                {/* ── Target Details ─────────────────────────── */}
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
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="target-desc" className="text-sm font-medium">
                      Description
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        Optional
                      </span>
                    </Label>
                    <Textarea
                      id="target-desc"
                      placeholder="Add context about how this target should be tracked or why it matters..."
                      value={formState.description}
                      onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                      className="min-h-[72px] resize-none"
                    />
                  </div>
                </SlidePanelSection>

                {/* ── Values ───────────────────────────────── */}
                {formState.metricType !== 'boolean' ? (
                  <SlidePanelSection label="Values">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="start-value" className="text-sm font-medium">
                          Starting at
                        </Label>
                        <Input
                          id="start-value"
                          type="number"
                          placeholder="0"
                          value={formState.startValue}
                          onChange={(e) =>
                            setFormState({ ...formState, startValue: e.target.value })
                          }
                        />
                        <p className="text-xs text-muted-foreground">Where you are now</p>
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
                          onChange={(e) =>
                            setFormState({ ...formState, targetValue: e.target.value })
                          }
                        />
                        <p className="text-xs text-muted-foreground">Where you want to be</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            onChange={(e) => setFormState({ ...formState, weight: e.target.value })}
                            className="pr-8"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                        <p
                          className={`text-xs ${
                            formState.weight !== '' && Number(formState.weight) > remainingWeight
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                          }`}
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
                          onChange={(e) => setFormState({ ...formState, weight: e.target.value })}
                          className="pr-8"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                      <p
                        className={`text-xs ${
                          formState.weight !== '' && Number(formState.weight) > remainingWeight
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {remainingWeight <= 0
                          ? '100% already allocated'
                          : `${remainingWeight}% available`}
                      </p>
                    </div>
                  </SlidePanelSection>
                )}
              </>
            ) : (
              <>
                {/* ── Step 2: Rubric Descriptors ──────────────── */}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="shrink-0">
                      {METRIC_TYPE_CONFIG[formState.metricType].label}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{formState.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formState.metricType === 'boolean'
                          ? 'Done / Not Done'
                          : `${formState.startValue} → ${formState.targetValue}${formState.unit ? ` ${formState.unit}` : ''}`}
                      </p>
                    </div>
                  </div>
                </div>

                <SlidePanelSection label="Rubric Descriptors">
                  <p className="text-xs text-muted-foreground mb-1">
                    Describe what each rating level means for this target based on your goal.
                  </p>
                  {([1, 2, 3, 4] as const).map((level) => {
                    const key = `rubric${level}` as `rubric${1 | 2 | 3 | 4}`;
                    const labels = [
                      'Beginning / Needs Improvement',
                      'Developing / Approaching',
                      'Proficient / Meets Expectations',
                      'Exemplary / Exceeds Expectations',
                    ];
                    return (
                      <div key={level} className="space-y-1.5">
                        <Label htmlFor={`rubric-${level}`} className="text-sm font-medium">
                          Rating {level}{' '}
                          <span className="font-normal text-muted-foreground">
                            — {labels[level - 1]}
                          </span>
                        </Label>
                        <Textarea
                          id={`rubric-${level}`}
                          placeholder={
                            formState.metricType === 'boolean'
                              ? level <= 2
                                ? 'e.g., Not completed or partially done'
                                : 'e.g., Fully completed ahead of schedule'
                              : `e.g., ${
                                  level === 4
                                    ? `${formState.targetValue} and above`
                                    : level === 1
                                      ? `Below ${Math.round(Number(formState.targetValue) * 0.25)}`
                                      : `Around ${Math.round(Number(formState.targetValue) * 0.25 * level)}`
                                }${formState.unit ? ` ${formState.unit}` : ''}`
                          }
                          value={formState[key]}
                          onChange={(e) => setFormState({ ...formState, [key]: e.target.value })}
                          className="min-h-[60px] resize-none"
                        />
                      </div>
                    );
                  })}
                </SlidePanelSection>
              </>
            )}
          </SlidePanelBody>

          <SlidePanelFooter>
            {formStep === 1 ? (
              <>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setFormStep(2)}
                  disabled={
                    !formState.name.trim() ||
                    !formState.weight ||
                    Number(formState.weight) <= 0 ||
                    Number(formState.weight) > remainingWeight
                  }
                >
                  Next: Define Rubrics
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setFormStep(1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => void handleSaveTarget()}
                  disabled={
                    !formState.rubric1.trim() ||
                    !formState.rubric2.trim() ||
                    !formState.rubric3.trim() ||
                    !formState.rubric4.trim() ||
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
              </>
            )}
          </SlidePanelFooter>
        </SlidePanelContent>
      </SlidePanel>

      {/* Update Progress Dialog */}
      <Dialog open={progressTarget !== null} onOpenChange={() => setProgressTarget(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
            <DialogDescription>{progressTarget?.name}</DialogDescription>
          </DialogHeader>
          {progressTarget && (
            <div className="space-y-4 py-4">
              {progressTarget.metricType === 'boolean' ? (
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
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
                      Range: {progressTarget.startValue} → {progressTarget.targetValue}
                      {progressTarget.unit ? ` ${progressTarget.unit}` : ''}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="progress-val">Current Value</Label>
                    <Input
                      id="progress-val"
                      type="number"
                      value={progressValue}
                      onChange={(e) => setProgressValue(e.target.value)}
                    />
                  </div>
                  <Progress
                    value={
                      progressTarget.targetValue > progressTarget.startValue
                        ? Math.min(
                            ((Number(progressValue) - progressTarget.startValue) /
                              (progressTarget.targetValue - progressTarget.startValue)) *
                              100,
                            100
                          )
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              )}

              {/* Self-Assessment Rating */}
              {progressTarget.rubric1 && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-sm font-medium">Self-Assessment</p>
                  <p className="text-xs text-muted-foreground">
                    Rate your performance based on the rubric descriptors you defined.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {([1, 2, 3, 4] as const).map((level) => {
                      const rubricKey = `rubric${level}` as const;
                      const rubricText = progressTarget[rubricKey];
                      const isSelected = progressSelfRating === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setProgressSelfRating(isSelected ? null : level)}
                          className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-zinc-200 hover:border-primary/30 dark:border-zinc-800'
                          }`}
                        >
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}
                          >
                            {level}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {rubricText || `Rating ${level}`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressTarget(null)}>
              Cancel
            </Button>
            {(progressTarget?.metricType !== 'boolean' || progressTarget?.rubric1) && (
              <Button onClick={() => void handleUpdateProgress()} disabled={updateTarget.isPending}>
                Update
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={objectiveDeleteOpen} onOpenChange={setObjectiveDeleteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete objective?</DialogTitle>
            <DialogDescription>
              This will remove the objective and all of its targets from your OKRs & KPIs
              workspace.
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

// =============================================
// Target Card Component
// =============================================

interface TargetCardProps {
  target: OKRTarget;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateProgress: () => void;
}

function TargetCard({ target, onEdit, onDelete, onUpdateProgress }: TargetCardProps): ReactNode {
  const config = METRIC_TYPE_CONFIG[target.metricType];
  const Icon = config.icon;
  const weightPct = target.weight;

  const displayValue =
    target.metricType === 'boolean'
      ? target.currentValue === 1
        ? 'Done'
        : 'Not Done'
      : target.metricType === 'currency'
        ? `${target.unit || 'PHP'} ${target.currentValue.toLocaleString()} / ${target.targetValue.toLocaleString()}`
        : `${target.currentValue} / ${target.targetValue}${target.unit ? ` ${target.unit}` : ''}`;

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Metric Type Icon */}
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
              target.progressPercentage >= 100
                ? 'bg-success/10 text-success'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {target.progressPercentage >= 100 ? (
              <Check className="h-5 w-5" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-medium text-foreground truncate">{target.name}</h4>
                {target.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
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

            {/* Progress row */}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1">
                <Progress
                  value={Math.min(target.progressPercentage, 100)}
                  className="h-2"
                  indicatorClassName={getProgressBarColor(target.progressPercentage)}
                />
              </div>
              <span
                className={`text-sm font-semibold min-w-[3rem] text-right ${getProgressColor(target.progressPercentage)}`}
              >
                {target.progressPercentage}%
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs h-5">
                {config.label}
              </Badge>
              <span>{displayValue}</span>
              {target.selfRating && (
                <Badge variant="secondary" className="text-xs h-5">
                  Self: {target.selfRating}/4
                </Badge>
              )}
              <span className="ml-auto">Weight: {weightPct}%</span>
            </div>

            {/* Admin rating if present */}
            {target.adminRating && (
              <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/10">
                <p className="text-xs font-medium text-primary">
                  Admin Rating: {target.adminRating}
                </p>
                {target.adminComments && (
                  <p className="text-xs text-muted-foreground mt-0.5">{target.adminComments}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
