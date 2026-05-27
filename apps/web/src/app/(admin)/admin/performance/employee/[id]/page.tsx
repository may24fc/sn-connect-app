'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import {
  type IndividualPerformanceData,
  useIndividualPerformance,
} from '@/hooks/useIndividualPerformance';
import { type KPIEvidenceRow, useKPIEvidence } from '@/hooks/useKPIEvidence';
import { type OKRTargetEvidenceRow, useOKRTargetEvidence } from '@/hooks/useOKRTargetEvidence';
import { useUpdateOKR, useUpdateOKRTarget } from '@/hooks/usePerformance';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
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
  Label,
  type PerformanceRating,
  RATING_CONFIG,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock,
  Crosshair,
  DollarSign,
  Download,
  Eye,
  FileText,
  Hash,
  ListChecks,
  Paperclip,
  Star,
  Target,
  ToggleLeft,
  Weight,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';

// ─── Helpers ────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
    case 'in_progress':
    case 'active':
      return 'text-slate-700 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/20';
    case 'not_started':
    case 'pending':
      return 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800';
    case 'at_risk':
      return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
    default:
      return 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800';
  }
}

function getProgressColor(value: number): string {
  if (value >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (value >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getProgressBarColor(value: number): string {
  if (value >= 75) return 'bg-emerald-500';
  if (value >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function computeTargetProgress(target: IndividualPerformanceData['okrTargets'][number]): number {
  switch (target.metric_type) {
    case 'boolean':
      return target.current_value >= 1 ? 100 : 0;
    case 'number':
    case 'currency':
    case 'tasks':
      return target.target_value > 0
        ? Math.min(100, Math.max(0, Math.round((target.current_value / target.target_value) * 100)))
        : 0;
    default:
      return 0;
  }
}

function computeKpiProgress(kpi: IndividualPerformanceData['kpis'][number]): number {
  return kpi.target_value > 0
    ? Math.min(100, Math.max(0, Math.round((kpi.current_value / kpi.target_value) * 100)))
    : 0;
}

function computeWeightedMean(targets: IndividualPerformanceData['okrTargets']): number {
  if (targets.length === 0) return 0;
  const totalWeight = targets.reduce((sum, t) => sum + t.weight, 0);
  if (totalWeight === 0) {
    const avg = targets.reduce((sum, t) => sum + computeTargetProgress(t), 0) / targets.length;
    return Math.round(avg);
  }
  const weighted = targets.reduce((sum, t) => sum + computeTargetProgress(t) * t.weight, 0);
  return Math.round(weighted / totalWeight);
}

function getObjectiveDisplayStatus(status: string, progress: number): string {
  if (progress >= 100) {
    return 'completed';
  }

  if (status === 'completed') {
    return 'in_progress';
  }

  return status;
}

function metricTypeLabel(type: string): string {
  switch (type) {
    case 'number':
      return 'Number';
    case 'boolean':
      return 'True/False';
    case 'currency':
      return 'Currency';
    case 'tasks':
      return 'Task';
    default:
      return type;
  }
}

function formatEvaluatorSummary(firstName: string | null, position: string | null): string {
  const parts = [firstName?.trim(), position?.trim()].filter(Boolean);

  if (parts.length === 0) {
    return 'Evaluated by: HR Manager';
  }

  return `Evaluated by: ${parts.join(', ')}`;
}

const METRIC_ICONS: Record<string, typeof Hash> = {
  number: Hash,
  boolean: ToggleLeft,
  currency: DollarSign,
  tasks: ListChecks,
};

// ─── Types ──────────────────────────────────────────────────────

interface ObjectiveWithTargets {
  okr: IndividualPerformanceData['okrs'][number];
  targets: IndividualPerformanceData['okrTargets'];
  mean: number;
}

interface TargetEvaluation {
  rating: PerformanceRating | null;
  comments: string;
}

interface EvaluationFormState {
  targetRatings: Record<string, TargetEvaluation>;
  overallRating: PerformanceRating | null;
  comments: string;
}

interface PerformanceItemDetail {
  id: string;
  type: 'target' | 'kpi';
  title: string;
  objectiveTitle: string;
  cycleName: string | null;
  metricLabel: string;
  progressLabel: string;
  progress: number;
  employeeComment: string | null;
  adminComment: string | null;
  sourceLabel: string;
}

const emptyEvaluation: EvaluationFormState = {
  targetRatings: {},
  overallRating: null,
  comments: '',
};

function toPerformanceRating(value: string | null | undefined): PerformanceRating | null {
  if (!value) return null;
  return value as PerformanceRating;
}

function hasCalibrationOverride(
  currentRating: PerformanceRating | null,
  baselineRating: PerformanceRating | null
): boolean {
  return currentRating != null && baselineRating != null && currentRating !== baselineRating;
}

function isObjectiveEvaluationSaved(objective: ObjectiveWithTargets): boolean {
  const hasOverallRating = Boolean(objective.okr.admin_rating);
  const hasTargetRatings =
    objective.targets.length === 0 ||
    objective.targets.every((target) => Boolean(target.admin_rating));

  return hasOverallRating && hasTargetRatings;
}

function isObjectiveEvaluationFinalized(objective: ObjectiveWithTargets): boolean {
  return isObjectiveEvaluationSaved(objective) && objective.okr.evaluator_role === 'super_admin';
}

type AssessmentEvidenceItem = KPIEvidenceRow | OKRTargetEvidenceRow;

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getEvidenceActionUrl(item: AssessmentEvidenceItem): string | null {
  if ('download_url' in item && item.download_url) {
    return item.download_url;
  }

  if (item.evidence_type === 'link' || item.evidence_type === 'file') {
    return item.content;
  }

  return null;
}

function buildTargetDetailItem({
  target,
  objectiveTitle,
  cycleName,
}: {
  target: IndividualPerformanceData['okrTargets'][number];
  objectiveTitle: string;
  cycleName: string | null;
}): PerformanceItemDetail {
  const progress = computeTargetProgress(target);

  return {
    id: target.id,
    type: 'target',
    title: target.name,
    objectiveTitle,
    cycleName,
    metricLabel: metricTypeLabel(target.metric_type),
    progressLabel:
      target.metric_type === 'boolean'
        ? target.current_value >= 1
          ? 'Done'
          : 'Not done'
        : `${target.current_value}${target.unit ? ` ${target.unit}` : ''} / ${target.target_value}${target.unit ? ` ${target.unit}` : ''}`,
    progress,
    employeeComment: target.self_comments ?? null,
    adminComment: target.admin_comments ?? null,
    sourceLabel: 'Objective KPI',
  };
}

function buildStandaloneKpiDetailItem({
  kpi,
  cycleName,
}: {
  kpi: IndividualPerformanceData['kpis'][number];
  cycleName: string | null;
}): PerformanceItemDetail {
  return {
    id: kpi.id,
    type: 'kpi',
    title: kpi.name,
    objectiveTitle: 'Standalone KPI',
    cycleName,
    metricLabel: kpi.kpi_type === 'scale' ? 'Scale KPI' : 'Numeric KPI',
    progressLabel: `${kpi.current_value}${kpi.unit ? ` ${kpi.unit}` : ''} / ${kpi.target_value}${kpi.unit ? ` ${kpi.unit}` : ''}`,
    progress: computeKpiProgress(kpi),
    employeeComment: kpi.self_comments ?? null,
    adminComment: kpi.admin_comments ?? null,
    sourceLabel: 'KPI',
  };
}

// ─── Descriptive Rating Option Card ─────────────────────────────

function RatingOptionCard({
  rating,
  selected,
  onClick,
  compact,
}: {
  rating: PerformanceRating;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}): ReactNode {
  const config = RATING_CONFIG[rating];
  const scoreText = `${config.score}/5`;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
          selected
            ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
            : 'border-border hover:bg-muted/50 hover:border-muted-foreground/30'
        }`}
      >
        <div
          className={`h-3 w-3 rounded-full shrink-0 ${config.color} ${selected ? 'ring-2 ring-offset-1 ring-offset-background ring-primary/40' : ''}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">{config.label}</p>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{scoreText}</span>
        {selected && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
          : 'border-border hover:bg-muted/50 hover:border-muted-foreground/30'
      }`}
    >
      <div
        className={`h-5 w-5 rounded-full shrink-0 mt-0.5 ${config.color} ${selected ? 'ring-2 ring-offset-1 ring-offset-background ring-primary/40' : ''}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{config.label}</p>
          <Badge variant="outline" className="text-[10px] tabular-nums shrink-0">
            Score: {scoreText}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{config.description}</p>
      </div>
      {selected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
    </button>
  );
}

// ─── Target Evaluation Card ─────────────────────────────────────

function TargetEvaluationCard({
  target,
  evaluation,
  isSupervisorReview,
  onChange,
}: {
  target: IndividualPerformanceData['okrTargets'][number];
  evaluation: TargetEvaluation;
  isSupervisorReview: boolean;
  onChange: (eval_: TargetEvaluation) => void;
}): ReactNode {
  const Icon = METRIC_ICONS[target.metric_type] || Hash;
  const progress = computeTargetProgress(target);
  const baselineRating = toPerformanceRating(target.admin_rating);
  const baselineConfig = baselineRating ? RATING_CONFIG[baselineRating] : null;
  const hasOverride = hasCalibrationOverride(evaluation.rating, baselineRating);
  const evaluatorSummary = formatEvaluatorSummary(
    target.evaluator_first_name,
    target.evaluator_position
  );
  const displayValue =
    target.metric_type === 'boolean'
      ? target.current_value >= 1
        ? 'Completed'
        : 'Not Completed'
      : `${target.current_value}${target.unit ? ` ${target.unit}` : ''} / ${target.target_value}${target.unit ? ` ${target.unit}` : ''}`;

  return (
    <div className="p-4 rounded-lg border border-border bg-card space-y-4">
      {/* Target Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{target.name}</p>
            {target.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {target.description}
              </p>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">
          {metricTypeLabel(target.metric_type)}
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className={`font-medium tabular-nums ${getProgressColor(progress)}`}>
            {progress}%
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(progress)}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{displayValue}</span>
          <span>Weight: {target.weight}%</span>
        </div>
      </div>

      {/* Rating Selection */}
      <div className="space-y-2">
        {isSupervisorReview && baselineConfig && (
          <div className="rounded-lg border border-border bg-muted/35 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground">{evaluatorSummary}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{baselineConfig.label}</p>
                {target.admin_comments && (
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    &ldquo;{target.admin_comments}&rdquo;
                  </p>
                )}
              </div>
              <Badge variant="outline" className="shrink-0 tabular-nums">
                {baselineConfig.score}/5
              </Badge>
            </div>
          </div>
        )}

        <Label className="text-xs font-medium">
          {isSupervisorReview ? 'Validate or calibrate this target' : 'Rate this target'}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-1 gap-2">
          {(Object.keys(RATING_CONFIG) as Array<PerformanceRating>).map((r) => (
            <RatingOptionCard
              key={r}
              rating={r}
              selected={evaluation.rating === r}
              onClick={() => onChange({ ...evaluation, rating: r })}
              compact
            />
          ))}
        </div>

        <AnimatePresence initial={false}>
          {isSupervisorReview && hasOverride && baselineConfig && (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Label className="text-xs font-medium">
                  Reason for score calibration from HR baseline{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  placeholder={`Explain why this score changed from ${baselineConfig.label}.`}
                  value={evaluation.comments}
                  onChange={(e) => onChange({ ...evaluation, comments: e.target.value })}
                  className="min-h-[88px] text-sm"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Comments for this target */}
      {(!isSupervisorReview || !hasOverride) && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">
            {isSupervisorReview ? 'Notes (optional)' : 'Comments (optional)'}
          </Label>
          <Textarea
            placeholder={
              isSupervisorReview
                ? 'Add review notes for this target if needed...'
                : 'Add specific feedback for this target...'
            }
            value={evaluation.comments}
            onChange={(e) => onChange({ ...evaluation, comments: e.target.value })}
            className="min-h-[60px] text-sm"
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function EmployeePerformanceDetailPage(): ReactNode {
  const params = useParams();
  const handleBack = useBackNavigation({ fallbackPath: '/admin/performance' });
  const { user } = useAuth();
  const { addToast } = useToast();
  const employeeId = params.id as string;

  const { data, isLoading, isError, refetch } = useIndividualPerformance(employeeId);
  const updateOKR = useUpdateOKR();
  const updateTarget = useUpdateOKRTarget();
  const isSupervisorReview = user?.role === 'super_admin';

  const [expandedOkrs, setExpandedOkrs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'view' | 'evaluate'>('view');

  // Evaluation modal state
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  const [selectedOKR, setSelectedOKR] = useState<ObjectiveWithTargets | null>(null);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [evalForm, setEvalForm] = useState<EvaluationFormState>(emptyEvaluation);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPerformanceItem, setSelectedPerformanceItem] =
    useState<PerformanceItemDetail | null>(null);

  // Build per-objective data with grouped targets
  const objectives: ObjectiveWithTargets[] = useMemo(() => {
    if (!data) return [];
    return data.okrs.map((okr) => {
      const targets = (data.okrTargets || [])
        .filter((t) => t.okr_id === okr.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      return { okr, targets, mean: computeWeightedMean(targets) };
    });
  }, [data]);

  // Overall weighted mean across all objectives
  const overallWeightedMean = useMemo(() => {
    if (objectives.length === 0) return 0;
    const totalWeight = objectives.reduce((sum, o) => sum + (o.okr.weight || 0), 0);
    if (totalWeight === 0) {
      const avg = objectives.reduce((sum, o) => sum + o.mean, 0) / objectives.length;
      return Math.round(avg);
    }
    const weighted = objectives.reduce((sum, o) => sum + o.mean * (o.okr.weight || 0), 0);
    return Math.round(weighted / totalWeight);
  }, [objectives]);

  // All objectives stay evaluatable regardless of progress or current status.
  const evaluatableObjectives = useMemo(() => {
    return objectives;
  }, [objectives]);

  const cycleNamesById = useMemo(() => {
    if (!data) return new Map<string, string | null>();

    return new Map(
      data.reviews
        .filter((review) => review.review_cycles)
        .map((review) => [review.cycle_id, review.review_cycles?.name ?? null])
    );
  }, [data]);

  const standaloneKpis = useMemo(() => {
    if (!data) return [];

    return data.kpis.map((kpi) =>
      buildStandaloneKpiDetailItem({
        kpi,
        cycleName: kpi.cycle_id ? (cycleNamesById.get(kpi.cycle_id) ?? null) : null,
      })
    );
  }, [cycleNamesById, data]);

  const { data: selectedTargetEvidenceResponse, isLoading: isTargetEvidenceLoading } =
    useOKRTargetEvidence(
      selectedPerformanceItem?.type === 'target' ? selectedPerformanceItem.id : null
    );
  const { data: selectedKpiEvidenceResponse, isLoading: isKpiEvidenceLoading } = useKPIEvidence(
    selectedPerformanceItem?.type === 'kpi' ? selectedPerformanceItem.id : null
  );

  const selectedEvidenceItems: AssessmentEvidenceItem[] =
    selectedPerformanceItem?.type === 'target'
      ? (selectedTargetEvidenceResponse?.data ?? [])
      : (selectedKpiEvidenceResponse?.data ?? []);
  const isSelectedEvidenceLoading =
    selectedPerformanceItem?.type === 'target' ? isTargetEvidenceLoading : isKpiEvidenceLoading;

  const toggleOkrExpanded = (okrId: string): void => {
    setExpandedOkrs((prev) => {
      const next = new Set(prev);
      if (next.has(okrId)) {
        next.delete(okrId);
      } else {
        next.add(okrId);
      }
      return next;
    });
  };

  const handleOpenEvaluateModal = (obj: ObjectiveWithTargets): void => {
    const initialTargetRatings = Object.fromEntries(
      obj.targets.map((target) => [
        target.id,
        {
          rating: toPerformanceRating(target.admin_rating),
          comments: isSupervisorReview ? '' : (target.admin_comments ?? ''),
        },
      ])
    ) as Record<string, TargetEvaluation>;

    setSelectedOKR(obj);
    setModalStep(1);
    setEvalForm({
      targetRatings: initialTargetRatings,
      overallRating: toPerformanceRating(obj.okr.admin_rating),
      comments: isSupervisorReview ? '' : (obj.okr.admin_comments ?? ''),
    });
    setEvaluationDialogOpen(true);
  };

  const handleSubmitEvaluation = async (): Promise<void> => {
    if (!user || !selectedOKR) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();

      // Update each target with admin rating
      for (const target of selectedOKR.targets) {
        const targetEval = evalForm.targetRatings[target.id];
        if (targetEval?.rating) {
          const targetPayload: Parameters<typeof updateTarget.mutateAsync>[0] = {
            id: target.id,
            okrId: selectedOKR.okr.id,
            adminRating: targetEval.rating,
            evaluatedBy: user.id,
            evaluatedAt: now,
          };
          if (targetEval.comments) {
            targetPayload.adminComments = targetEval.comments;
          }
          await updateTarget.mutateAsync(targetPayload);
        }
      }

      // Update objective with overall rating
      await updateOKR.mutateAsync({
        id: selectedOKR.okr.id,
        ...(evalForm.overallRating ? { adminRating: evalForm.overallRating } : {}),
        ...(evalForm.comments ? { adminComments: evalForm.comments } : {}),
        evaluatedBy: user.id,
        evaluatedAt: now,
      });

      addToast({
        title: 'Evaluation submitted',
        description: `Evaluation for "${selectedOKR.okr.objective}" has been saved`,
        variant: 'success',
      });

      setEvaluationDialogOpen(false);
      setSelectedOKR(null);
      setModalStep(1);
      setEvalForm(emptyEvaluation);
      refetch();
    } catch (error) {
      console.error('Failed to submit evaluation:', error);
      addToast({
        title: 'Error',
        description: 'Failed to submit evaluation',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = (): boolean => {
    if (!selectedOKR || selectedOKR.targets.length === 0) return true;
    return selectedOKR.targets.every((target) => {
      const targetEval = evalForm.targetRatings[target.id];
      if (!targetEval?.rating) {
        return false;
      }

      if (!isSupervisorReview) {
        return true;
      }

      const baselineRating = toPerformanceRating(target.admin_rating);
      if (!hasCalibrationOverride(targetEval.rating, baselineRating)) {
        return true;
      }

      return Boolean(targetEval.comments.trim());
    });
  };

  const overallBaselineRating = selectedOKR
    ? toPerformanceRating(selectedOKR.okr.admin_rating)
    : null;
  const overallBaselineConfig = overallBaselineRating ? RATING_CONFIG[overallBaselineRating] : null;
  const overallHasOverride = hasCalibrationOverride(evalForm.overallRating, overallBaselineRating);
  const overallEvaluatorSummary = selectedOKR
    ? formatEvaluatorSummary(
        selectedOKR.okr.evaluator_first_name,
        selectedOKR.okr.evaluator_position
      )
    : 'Evaluated by: HR Manager';

  const isStep2Valid = (): boolean => {
    if (!evalForm.overallRating) {
      return false;
    }

    if (!isSupervisorReview || !overallHasOverride) {
      return true;
    }

    return Boolean(evalForm.comments.trim());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-[400px]">
        <EmptyState
          icon={CircleAlert}
          title="Failed to load performance data"
          description="There was a problem loading this employee performance record."
          action={{
            label: 'Go Back',
            onClick: handleBack,
            icon: <ArrowLeft className="h-3.5 w-3.5" />,
          }}
        />
      </div>
    );
  }

  const { employee } = data;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="w-fit" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
        Back
      </Button>

      {/* Employee Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.avatarUrl || undefined} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(employee.fullName || 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground">{employee.fullName}</h1>
              <p className="text-sm text-muted-foreground">
                {employee.position || 'No position'} · {employee.department || 'No department'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs capitalize">
                  {employee.role?.replace('_', ' ') || '—'}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {employee.status?.replace('_', ' ') || '—'}
                </Badge>
                {employee.dateHired && (
                  <span className="text-xs text-muted-foreground">
                    Hired {formatDate(employee.dateHired)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Weighted Mean */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <h2 className="text-base font-semibold text-foreground">Overall Performance Score</h2>
            </div>
            <span
              className={`text-3xl font-bold tabular-nums ${getProgressColor(overallWeightedMean)}`}
            >
              {overallWeightedMean}%
            </span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(overallWeightedMean)}`}
              style={{ width: `${overallWeightedMean}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Weighted mean across {objectives.length} objective{objectives.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Main Tabs: View / Evaluate */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'view' | 'evaluate')}
        className="w-full"
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="view" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View OKRs & KPIs
          </TabsTrigger>
          <TabsTrigger value="evaluate" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Evaluate ({evaluatableObjectives.length})
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════ VIEW TAB ═══════════════ */}
        <TabsContent value="view" className="mt-4 space-y-4">
          {objectives.length === 0 && standaloneKpis.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-8 w-8 text-muted-foreground/40 mb-2" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">No OKRs or KPIs assigned</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {objectives.map(({ okr, targets, mean }) => {
                const isExpanded = expandedOkrs.has(okr.id);
                const displayStatus = getObjectiveDisplayStatus(okr.status, mean);

                return (
                  <Card key={okr.id} className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleOkrExpanded(okr.id)}
                      className="w-full p-4 text-left transition-colors hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {isExpanded ? (
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="truncate text-sm font-semibold text-foreground">
                                {okr.objective}
                              </h3>
                              <Badge
                                className={`text-xs capitalize shrink-0 ${getStatusColor(displayStatus)}`}
                              >
                                {displayStatus.replace('_', ' ')}
                              </Badge>
                            </div>
                            {okr.description && (
                              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                {okr.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-4 flex-wrap">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Weight className="h-3 w-3" />
                                <span>Weight: {okr.weight}%</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <ListChecks className="h-3 w-3" />
                                <span>
                                  {targets.length} KPI item{targets.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`text-xl font-bold tabular-nums ${getProgressColor(mean)}`}
                          >
                            {mean}%
                          </span>
                          <p className="text-[10px] text-muted-foreground">objective progress</p>
                        </div>
                      </div>
                      <div className="mt-3 ml-7">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(mean)}`}
                            style={{ width: `${mean}%` }}
                          />
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border bg-muted/10">
                        {targets.length === 0 ? (
                          <div className="px-6 py-6 text-center">
                            <p className="text-sm text-muted-foreground">
                              No KPI items defined for this OKR
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-border">
                            {targets.map((target) => {
                              const targetProgress = computeTargetProgress(target);

                              return (
                                <button
                                  key={target.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedPerformanceItem(
                                      buildTargetDetailItem({
                                        target,
                                        objectiveTitle: okr.objective,
                                        cycleName: target.cycle_id
                                          ? (cycleNamesById.get(target.cycle_id) ?? null)
                                          : null,
                                      })
                                    )
                                  }
                                  className="w-full px-6 py-4 text-left transition-colors hover:bg-background/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        {targetProgress >= 100 ? (
                                          <CheckCircle2
                                            className="h-4 w-4 shrink-0 text-emerald-500"
                                            strokeWidth={1.5}
                                          />
                                        ) : (
                                          <Clock
                                            className="h-4 w-4 shrink-0 text-muted-foreground"
                                            strokeWidth={1.5}
                                          />
                                        )}
                                        <span className="truncate text-sm font-medium text-foreground">
                                          {target.name}
                                        </span>
                                      </div>
                                      {target.description && (
                                        <p className="mt-1 ml-6 text-xs text-muted-foreground">
                                          {target.description}
                                        </p>
                                      )}
                                      <div className="mt-2 ml-6 flex items-center gap-3 flex-wrap">
                                        <Badge variant="outline" className="text-[10px]">
                                          {metricTypeLabel(target.metric_type)}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                          {target.metric_type === 'boolean'
                                            ? target.current_value >= 1
                                              ? 'Done'
                                              : 'Not Done'
                                            : `${target.current_value}${target.unit ? ` ${target.unit}` : ''} / ${target.target_value}${target.unit ? ` ${target.unit}` : ''}`}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          Weight: {target.weight}%
                                        </span>
                                      </div>
                                    </div>
                                    <span
                                      className={`shrink-0 text-sm font-semibold tabular-nums ${getProgressColor(targetProgress)}`}
                                    >
                                      {targetProgress}%
                                    </span>
                                  </div>
                                  <div className="mt-2 ml-6">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(targetProgress)}`}
                                        style={{ width: `${targetProgress}%` }}
                                      />
                                    </div>
                                  </div>
                                  <div className="mt-3 ml-6 flex items-center gap-2 text-xs font-medium text-primary">
                                    <Paperclip className="h-3.5 w-3.5" />
                                    View progress and attachments
                                  </div>
                                  {target.admin_comments && (
                                    <p className="mt-2 ml-6 text-xs italic text-muted-foreground">
                                      Admin: &ldquo;{target.admin_comments}&rdquo;
                                    </p>
                                  )}
                                  {target.admin_rating && (
                                    <div className="mt-1 ml-6 flex items-center gap-1">
                                      <Star className="h-3 w-3 text-amber-500" strokeWidth={1.5} />
                                      <span className="text-xs text-muted-foreground">
                                        Rating:{' '}
                                        {RATING_CONFIG[target.admin_rating as PerformanceRating]
                                          ?.label || target.admin_rating}
                                      </span>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {okr.admin_comments && (
                          <div className="border-t border-border bg-muted/20 px-6 py-3">
                            <p className="text-xs italic text-muted-foreground">
                              Objective comment: &ldquo;{okr.admin_comments}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}

              {standaloneKpis.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Standalone KPIs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {standaloneKpis.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedPerformanceItem(item)}
                        className="w-full rounded-xl border border-border bg-muted/10 px-4 py-4 text-left transition hover:border-primary/30 hover:bg-muted/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground">{item.title}</p>
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {item.metricLabel}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.progressLabel}
                            </p>
                            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-primary">
                              <Paperclip className="h-3.5 w-3.5" />
                              View progress and attachments
                            </div>
                          </div>
                          <span
                            className={`shrink-0 text-sm font-semibold tabular-nums ${getProgressColor(item.progress)}`}
                          >
                            {item.progress}%
                          </span>
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════ EVALUATE TAB ═══════════════ */}
        <TabsContent value="evaluate" className="mt-4">
          {evaluatableObjectives.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardCheck
                  className="h-8 w-8 text-muted-foreground/40 mb-2"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-muted-foreground">
                  No objectives available for evaluation
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Any OKR on this employee record can be evaluated here, regardless of progress.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {evaluatableObjectives.map((objective) => {
                const { okr, targets, mean } = objective;
                const isSaved = isObjectiveEvaluationSaved(objective);
                const isFinalized = isObjectiveEvaluationFinalized(objective);
                const displayStatus = getObjectiveDisplayStatus(okr.status, mean);

                return (
                  <Card
                    key={okr.id}
                    className={
                      isFinalized
                        ? 'overflow-hidden border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/10'
                        : 'overflow-hidden'
                    }
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <Target className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-foreground">
                                {okr.objective}
                              </h3>
                              <Badge
                                className={`text-xs capitalize ${getStatusColor(displayStatus)}`}
                              >
                                {displayStatus.replace('_', ' ')}
                              </Badge>
                              {isFinalized ? (
                                <Badge variant="success" className="text-xs">
                                  Evaluation Complete
                                </Badge>
                              ) : isSaved ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-emerald-700 dark:text-emerald-400"
                                >
                                  Saved Evaluation
                                </Badge>
                              ) : null}
                            </div>
                            {okr.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {okr.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                Weight: {okr.weight}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {targets.length} target{targets.length !== 1 ? 's' : ''}
                              </span>
                              <span className={`text-xs font-medium ${getProgressColor(mean)}`}>
                                {mean}% progress
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isSaved ? 'outline' : 'default'}
                          className={
                            isFinalized
                              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-300'
                              : undefined
                          }
                          onClick={() => handleOpenEvaluateModal({ okr, targets, mean })}
                        >
                          {isSaved ? (
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                          ) : (
                            <ClipboardCheck className="h-4 w-4 mr-1.5" />
                          )}
                          {isFinalized
                            ? 'Evaluation Complete'
                            : isSaved
                              ? 'Edit Evaluation'
                              : 'Evaluate'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════ EVALUATION MODAL ═══════════════ */}
      <Dialog
        open={selectedPerformanceItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPerformanceItem(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              KPI Progress Details
            </DialogTitle>
            <DialogDescription>
              Read-only view of the selected KPI progress and uploaded supporting attachments.
            </DialogDescription>
          </DialogHeader>

          {selectedPerformanceItem && (
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              <div className="rounded-xl border border-border bg-muted/10 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-foreground">
                        {selectedPerformanceItem.title}
                      </h3>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {selectedPerformanceItem.sourceLabel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Under objective: {selectedPerformanceItem.objectiveTitle}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedPerformanceItem.cycleName || 'Current cycle'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-3">
                      {selectedPerformanceItem.metricLabel} •{' '}
                      {selectedPerformanceItem.progressLabel}
                    </p>

                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span className="font-medium text-foreground">
                          {selectedPerformanceItem.progress}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(selectedPerformanceItem.progress)}`}
                          style={{ width: `${selectedPerformanceItem.progress}%` }}
                        />
                      </div>
                    </div>

                    {selectedPerformanceItem.employeeComment && (
                      <div className="mt-4 rounded-lg border border-border bg-background px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Employee Note
                        </p>
                        <p className="mt-2 text-sm text-foreground">
                          {selectedPerformanceItem.employeeComment}
                        </p>
                      </div>
                    )}

                    {selectedPerformanceItem.adminComment && (
                      <div className="mt-4 rounded-lg border border-border bg-background px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Admin Comment
                        </p>
                        <p className="mt-2 text-sm text-foreground">
                          {selectedPerformanceItem.adminComment}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 rounded-xl border border-primary/15 bg-primary/5 px-5 py-4 text-center min-w-[148px]">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Progress
                    </p>
                    <div className="mt-2 flex items-end justify-center gap-1">
                      <span
                        className={`text-5xl font-bold leading-none ${getProgressColor(selectedPerformanceItem.progress)}`}
                      >
                        {selectedPerformanceItem.progress}
                      </span>
                      <span className="pb-1 text-base text-muted-foreground">%</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {selectedPerformanceItem.progressLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Supporting Attachments</p>
                    <p className="text-xs text-muted-foreground">
                      Supporting files and links uploaded for this KPI update.
                    </p>
                  </div>
                  <Badge
                    className={
                      selectedEvidenceItems.length > 0
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }
                  >
                    {selectedEvidenceItems.length > 0
                      ? `${selectedEvidenceItems.length} attachment${selectedEvidenceItems.length !== 1 ? 's' : ''}`
                      : 'Missing required attachment'}
                  </Badge>
                </div>

                {isSelectedEvidenceLoading ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                    Loading attachments...
                  </div>
                ) : selectedEvidenceItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-red-200 bg-red-50/60 px-4 py-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                    No supporting attachment has been uploaded for this item yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedEvidenceItems.map((item) => {
                      const actionUrl = getEvidenceActionUrl(item);

                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border border-border bg-background px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {item.label || item.file_name || 'Supporting attachment'}
                                </p>
                                <Badge variant="outline" className="text-[10px] uppercase">
                                  {item.evidence_type}
                                </Badge>
                              </div>
                              <p className="truncate text-xs text-muted-foreground mt-1">
                                {item.file_name || item.content}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {item.submitted_by_name} • {formatDate(item.created_at)}
                                {item.file_size ? ` • ${formatFileSize(item.file_size)}` : ''}
                              </p>
                              {item.evidence_type === 'note' && (
                                <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground">
                                  {item.content}
                                </p>
                              )}
                            </div>

                            {actionUrl && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(actionUrl, '_blank', 'noopener,noreferrer')
                                }
                              >
                                <Download className="mr-1.5 h-4 w-4" />
                                Open
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPerformanceItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={evaluationDialogOpen} onOpenChange={setEvaluationDialogOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              {isSupervisorReview ? 'Review & Calibrate Objective' : 'Evaluate Objective'} — Step{' '}
              {modalStep} of 2
            </DialogTitle>
            <DialogDescription>
              {modalStep === 1
                ? isSupervisorReview
                  ? 'Review the HR manager baseline, keep matching scores, or calibrate any target that needs a different rating.'
                  : "Review each target and assign a rating based on the employee's performance"
                : isSupervisorReview
                  ? 'Confirm the final objective rating and add calibration-ready summary feedback.'
                  : 'Provide your overall assessment and comprehensive feedback'}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <div
                className={`h-2 flex-1 rounded-full transition-colors ${
                  modalStep >= 1 ? 'bg-primary' : 'bg-muted'
                }`}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {isSupervisorReview ? '1. Review Targets' : '1. Rate Targets'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <div
                className={`h-2 flex-1 rounded-full transition-colors ${
                  modalStep >= 2 ? 'bg-primary' : 'bg-muted'
                }`}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {isSupervisorReview ? '2. Final Summary' : '2. Overall Rating'}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 -mx-1 px-1">
            {/* Step 1: Rate each target */}
            {selectedOKR && modalStep === 1 && (
              <div className="space-y-4">
                {/* Objective Info */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground font-medium">Objective</p>
                  <p className="text-sm font-semibold mt-1">{selectedOKR.okr.objective}</p>
                  {selectedOKR.okr.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedOKR.okr.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Current Progress</span>
                        <span className="text-xs font-medium tabular-nums">
                          {selectedOKR.mean}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getProgressBarColor(selectedOKR.mean)}`}
                          style={{ width: `${selectedOKR.mean}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Weight</p>
                      <p className="text-sm font-medium">{selectedOKR.okr.weight}%</p>
                    </div>
                  </div>
                </div>

                {/* Target Ratings */}
                {selectedOKR.targets.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                    <ListChecks className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    No targets found for this objective
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-foreground">
                      {isSupervisorReview ? 'Review each target' : 'Rate each target'} (
                      {selectedOKR.targets.length})
                    </p>
                    {selectedOKR.targets.map((target) => (
                      <TargetEvaluationCard
                        key={target.id}
                        target={target}
                        isSupervisorReview={isSupervisorReview}
                        evaluation={
                          evalForm.targetRatings[target.id] || {
                            rating: null,
                            comments: '',
                          }
                        }
                        onChange={(eval_) =>
                          setEvalForm({
                            ...evalForm,
                            targetRatings: {
                              ...evalForm.targetRatings,
                              [target.id]: eval_,
                            },
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Overall Rating & Comments */}
            {modalStep === 2 && selectedOKR && (
              <div className="space-y-6">
                {/* Summary of target ratings */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-3">
                    Target Ratings Summary
                  </p>
                  <div className="space-y-2">
                    {selectedOKR.targets.map((target) => {
                      const targetRating = evalForm.targetRatings[target.id]?.rating;
                      return (
                        <div key={target.id} className="flex items-center justify-between gap-2">
                          <span className="text-sm truncate flex-1">{target.name}</span>
                          {targetRating ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <div
                                className={`h-2.5 w-2.5 rounded-full ${RATING_CONFIG[targetRating].color}`}
                              />
                              <span className="text-xs font-medium">
                                {RATING_CONFIG[targetRating].label}
                              </span>
                              <span className="text-[10px] text-muted-foreground tabular-nums">
                                ({RATING_CONFIG[targetRating].score}/5)
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Not Rated
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Overall Rating Selection */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">
                      {isSupervisorReview
                        ? 'Validate or calibrate the overall objective score'
                        : 'Overall Objective Rating'}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isSupervisorReview
                        ? 'Review the HR baseline for the full objective, keep the same score when it stands, or provide a calibration reason when you override it.'
                        : "Consider the employee's overall performance on this objective, including all targets, quality of work, and professional conduct."}
                    </p>
                  </div>

                  {isSupervisorReview && overallBaselineConfig && (
                    <div className="rounded-lg border border-border bg-muted/35 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-muted-foreground">
                            {overallEvaluatorSummary}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {overallBaselineConfig.label}
                          </p>
                          {selectedOKR.okr.admin_comments && (
                            <p className="mt-2 text-xs text-muted-foreground italic">
                              &ldquo;{selectedOKR.okr.admin_comments}&rdquo;
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0 tabular-nums">
                          {overallBaselineConfig.score}/5
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {(Object.keys(RATING_CONFIG) as Array<PerformanceRating>).map((rating) => (
                      <RatingOptionCard
                        key={rating}
                        rating={rating}
                        selected={evalForm.overallRating === rating}
                        onClick={() => setEvalForm({ ...evalForm, overallRating: rating })}
                      />
                    ))}
                  </div>

                  <AnimatePresence initial={false}>
                    {isSupervisorReview && overallHasOverride && overallBaselineConfig && (
                      <motion.div
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                          <Label className="text-xs font-medium">
                            Reason for score calibration from HR baseline{' '}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Textarea
                            placeholder={`Explain why this overall score changed from ${overallBaselineConfig.label}.`}
                            value={evalForm.comments}
                            onChange={(e) => setEvalForm({ ...evalForm, comments: e.target.value })}
                            className="min-h-[88px] text-sm"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Overall Comments */}
                {(!isSupervisorReview || !overallHasOverride) && (
                  <div className="space-y-2">
                    <Label htmlFor="eval-comments" className="text-sm font-semibold">
                      {isSupervisorReview ? 'Summary Notes' : 'Overall Feedback & Comments'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isSupervisorReview
                        ? 'Add optional supervisor notes when the HR baseline stands as-is.'
                        : 'Provide detailed, actionable feedback including strengths, areas for improvement, and recommendations for development.'}
                    </p>
                    <Textarea
                      id="eval-comments"
                      placeholder={
                        isSupervisorReview
                          ? 'Add supervisor notes for the final objective summary if needed...'
                          : 'Enter your detailed feedback here. Consider:\n• What did the employee do well?\n• What areas need improvement?\n• What specific actions should they take?'
                      }
                      value={evalForm.comments}
                      onChange={(e) => setEvalForm({ ...evalForm, comments: e.target.value })}
                      className="min-h-[140px]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border pt-4">
            {modalStep === 1 ? (
              <>
                <Button variant="outline" onClick={() => setEvaluationDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setModalStep(2)} disabled={!isStep1Valid()}>
                  Continue to Summary
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setModalStep(1)}>
                  Back to Targets
                </Button>
                <Button
                  onClick={() => void handleSubmitEvaluation()}
                  disabled={isSubmitting || !isStep2Valid()}
                >
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
