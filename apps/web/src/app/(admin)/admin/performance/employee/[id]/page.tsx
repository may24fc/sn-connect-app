'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import {
  type IndividualPerformanceData,
  useIndividualPerformance,
} from '@/hooks/useIndividualPerformance';
import { useUpdateOKR, useUpdateOKRTarget } from '@/hooks/usePerformance';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Crosshair,
  DollarSign,
  Eye,
  Hash,
  ListChecks,
  Star,
  Target,
  ToggleLeft,
  Weight,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
  if (target.metric_type === 'boolean') {
    return target.current_value >= 1 ? 100 : 0;
  }
  const range = target.target_value - target.start_value;
  if (range <= 0) return target.current_value >= target.target_value ? 100 : 0;
  const progress = ((target.current_value - target.start_value) / range) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
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

const emptyEvaluation: EvaluationFormState = {
  targetRatings: {},
  overallRating: null,
  comments: '',
};

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
  onChange,
}: {
  target: IndividualPerformanceData['okrTargets'][number];
  evaluation: TargetEvaluation;
  onChange: (eval_: TargetEvaluation) => void;
}): ReactNode {
  const Icon = METRIC_ICONS[target.metric_type] || Hash;
  const progress = computeTargetProgress(target);
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
        <Label className="text-xs font-medium">
          Rate this target <span className="text-destructive">*</span>
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
      </div>

      {/* Comments for this target */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Comments (optional)</Label>
        <Textarea
          placeholder="Add specific feedback for this target..."
          value={evaluation.comments}
          onChange={(e) => onChange({ ...evaluation, comments: e.target.value })}
          className="min-h-[60px] text-sm"
        />
      </div>
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

  const [expandedOkrs, setExpandedOkrs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'view' | 'evaluate'>('view');

  // Evaluation modal state
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  const [selectedOKR, setSelectedOKR] = useState<ObjectiveWithTargets | null>(null);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [evalForm, setEvalForm] = useState<EvaluationFormState>(emptyEvaluation);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Filter objectives for evaluation (submitted/approved/in_progress)
  const evaluatableObjectives = useMemo(() => {
    return objectives.filter(
      (o) =>
        o.okr.status === 'submitted' ||
        o.okr.status === 'approved' ||
        o.okr.status === 'in_progress'
    );
  }, [objectives]);

  const reviewTrendData = useMemo(() => {
    if (!data) return [];
    return [...data.reviews]
      .filter((review) => review.review_cycles?.name)
      .reverse()
      .map((review) => ({
        cycle: review.review_cycles?.name || 'Review',
        selfRating: review.self_rating,
        managerRating: review.manager_rating,
        finalRating: review.final_rating,
      }));
  }, [data]);

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
    setSelectedOKR(obj);
    setModalStep(1);
    setEvalForm(emptyEvaluation);
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
        status: 'completed',
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
    return selectedOKR.targets.every((t) => evalForm.targetRatings[t.id]?.rating != null);
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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <p className="text-sm text-red-500">Failed to load performance data</p>
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
          Go Back
        </Button>
      </div>
    );
  }

  const { employee, okrs, reviews } = data;

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

      <Card>
        <CardHeader>
          <CardTitle>Review Trend</CardTitle>
          <CardDescription>Historical review scores across completed review cycles.</CardDescription>
        </CardHeader>
        <CardContent>
          {reviewTrendData.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No review trend data is available yet.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reviewTrendData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="cycle" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis domain={[0, 5]} tickCount={6} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="selfRating"
                    name="Self"
                    stroke="#64748b"
                    strokeWidth={2}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="managerRating"
                    name="Manager"
                    stroke="#0f172a"
                    strokeWidth={2}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="finalRating"
                    name="Final"
                    stroke="#059669"
                    strokeWidth={2}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
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
            View Performance
          </TabsTrigger>
          <TabsTrigger value="evaluate" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Evaluate ({evaluatableObjectives.length})
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════ VIEW TAB ═══════════════ */}
        <TabsContent value="view" className="mt-4 space-y-4">
          <Tabs defaultValue="objectives">
            <TabsList>
              <TabsTrigger value="objectives">Objectives ({okrs.length})</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            </TabsList>

            {/* Objectives Sub-Tab */}
            <TabsContent value="objectives" className="mt-4">
              {objectives.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Target className="h-8 w-8 text-muted-foreground/40 mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">No objectives assigned</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {objectives.map(({ okr, targets, mean }) => {
                    const isExpanded = expandedOkrs.has(okr.id);
                    return (
                      <Card key={okr.id} className="overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleOkrExpanded(okr.id)}
                          className="w-full text-left p-4 hover:bg-muted/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-semibold text-foreground truncate">
                                    {okr.objective}
                                  </h3>
                                  <Badge
                                    className={`text-xs capitalize shrink-0 ${getStatusColor(okr.status)}`}
                                  >
                                    {okr.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                                {okr.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {okr.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Weight className="h-3 w-3" />
                                    <span>Weight: {okr.weight}%</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Target className="h-3 w-3" />
                                    <span>
                                      {targets.length} target{targets.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-center shrink-0">
                              <span
                                className={`text-xl font-bold tabular-nums ${getProgressColor(mean)}`}
                              >
                                {mean}%
                              </span>
                              <span className="text-[10px] text-muted-foreground">mean</span>
                            </div>
                          </div>
                          <div className="mt-3 ml-7">
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
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
                                  No targets defined for this objective
                                </p>
                              </div>
                            ) : (
                              <div className="divide-y divide-border">
                                {targets.map((target) => {
                                  const targetProgress = computeTargetProgress(target);
                                  return (
                                    <div key={target.id} className="px-6 py-4">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            {targetProgress >= 100 ? (
                                              <CheckCircle2
                                                className="h-4 w-4 text-emerald-500 shrink-0"
                                                strokeWidth={1.5}
                                              />
                                            ) : (
                                              <Clock
                                                className="h-4 w-4 text-muted-foreground shrink-0"
                                                strokeWidth={1.5}
                                              />
                                            )}
                                            <span className="text-sm font-medium text-foreground truncate">
                                              {target.name}
                                            </span>
                                          </div>
                                          {target.description && (
                                            <p className="text-xs text-muted-foreground mt-1 ml-6">
                                              {target.description}
                                            </p>
                                          )}
                                          <div className="flex items-center gap-3 mt-2 ml-6 flex-wrap">
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
                                          className={`text-sm font-semibold tabular-nums shrink-0 ${getProgressColor(targetProgress)}`}
                                        >
                                          {targetProgress}%
                                        </span>
                                      </div>
                                      <div className="mt-2 ml-6">
                                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(targetProgress)}`}
                                            style={{ width: `${targetProgress}%` }}
                                          />
                                        </div>
                                      </div>
                                      {target.admin_comments && (
                                        <p className="text-xs text-muted-foreground mt-2 ml-6 italic">
                                          Admin: &ldquo;{target.admin_comments}&rdquo;
                                        </p>
                                      )}
                                      {target.admin_rating && (
                                        <div className="flex items-center gap-1 mt-1 ml-6">
                                          <Star
                                            className="h-3 w-3 text-amber-500"
                                            strokeWidth={1.5}
                                          />
                                          <span className="text-xs text-muted-foreground">
                                            Rating:{' '}
                                            {RATING_CONFIG[target.admin_rating as PerformanceRating]
                                              ?.label || target.admin_rating}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {okr.admin_comments && (
                              <div className="px-6 py-3 bg-muted/20 border-t border-border">
                                <p className="text-xs text-muted-foreground italic">
                                  Objective comment: &ldquo;{okr.admin_comments}&rdquo;
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Reviews Sub-Tab */}
            <TabsContent value="reviews" className="mt-4">
              {reviews.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Star className="h-8 w-8 text-muted-foreground/40 mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">No performance reviews yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            {review.review_cycles?.name || 'Review'}
                          </CardTitle>
                          <Badge className={`text-xs capitalize ${getStatusColor(review.status)}`}>
                            {review.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {formatDate(review.review_cycles?.start_date)} –{' '}
                          {formatDate(review.review_cycles?.end_date)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Self Rating</p>
                            <p className="text-lg font-semibold text-foreground tabular-nums">
                              {review.self_rating ?? '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Manager Rating</p>
                            <p className="text-lg font-semibold text-foreground tabular-nums">
                              {review.manager_rating ?? '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Final Rating</p>
                            <p className="text-lg font-semibold text-foreground tabular-nums">
                              {review.final_rating ?? '—'}
                            </p>
                          </div>
                        </div>
                        {review.completed_at && (
                          <p className="text-xs text-muted-foreground mt-3">
                            Completed {formatDate(review.completed_at)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
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
                <p className="text-sm text-muted-foreground">No objectives pending evaluation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Objectives that are submitted, approved, or in progress can be evaluated
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {evaluatableObjectives.map(({ okr, targets, mean }) => (
                <Card key={okr.id} className="overflow-hidden">
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
                            <Badge className={`text-xs capitalize ${getStatusColor(okr.status)}`}>
                              {okr.status.replace('_', ' ')}
                            </Badge>
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
                        onClick={() => handleOpenEvaluateModal({ okr, targets, mean })}
                      >
                        <ClipboardCheck className="h-4 w-4 mr-1.5" />
                        Evaluate
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════ EVALUATION MODAL ═══════════════ */}
      <Dialog open={evaluationDialogOpen} onOpenChange={setEvaluationDialogOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Evaluate Objective — Step {modalStep} of 2
            </DialogTitle>
            <DialogDescription>
              {modalStep === 1
                ? "Review each target and assign a rating based on the employee's performance"
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
                1. Rate Targets
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <div
                className={`h-2 flex-1 rounded-full transition-colors ${
                  modalStep >= 2 ? 'bg-primary' : 'bg-muted'
                }`}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                2. Overall Rating
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 -mx-1 px-1">
            {/* Step 1: Rate each target */}
            {selectedOKR && modalStep === 1 && (
              <div className="space-y-4">
                {/* Objective Info */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground font-medium">
                    Objective
                  </p>
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
                      Rate each target ({selectedOKR.targets.length})
                    </p>
                    {selectedOKR.targets.map((target) => (
                      <TargetEvaluationCard
                        key={target.id}
                        target={target}
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
                      Overall Objective Rating <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Consider the employee&apos;s overall performance on this objective, including
                      all targets, quality of work, and professional conduct.
                    </p>
                  </div>
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
                </div>

                {/* Overall Comments */}
                <div className="space-y-2">
                  <Label htmlFor="eval-comments" className="text-sm font-semibold">
                    Overall Feedback & Comments
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Provide detailed, actionable feedback including strengths, areas for
                    improvement, and recommendations for development.
                  </p>
                  <Textarea
                    id="eval-comments"
                    placeholder={
                      'Enter your detailed feedback here. Consider:\n• What did the employee do well?\n• What areas need improvement?\n• What specific actions should they take?'
                    }
                    value={evalForm.comments}
                    onChange={(e) => setEvalForm({ ...evalForm, comments: e.target.value })}
                    className="min-h-[140px]"
                  />
                </div>
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
                  disabled={isSubmitting || !evalForm.overallRating}
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
