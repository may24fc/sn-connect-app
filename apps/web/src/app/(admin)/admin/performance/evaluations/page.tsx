'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  useOKRTargets,
  usePerformanceCycles,
  usePerformanceOKRs,
  useUpdateOKR,
  useUpdateOKRTarget,
} from '@/hooks/usePerformance';
import { usePerformanceRealtime } from '@/hooks/usePerformanceRealtime';
import {
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
  type OKR,
  type OKRTarget,
  type PerformanceRating,
  Progress,
  RATING_CONFIG,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  DollarSign,
  FileSearch,
  Hash,
  ListChecks,
  Target,
  ToggleLeft,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

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

function CompactRatingSelector({
  value,
  onChange,
}: {
  value: PerformanceRating | null;
  onChange: (rating: PerformanceRating) => void;
}): ReactNode {
  const ratings: Array<{ key: PerformanceRating; color: string; label: string }> = [
    { key: 'exceptional', color: 'bg-emerald-500', label: 'Exceptional' },
    { key: 'exceeds', color: 'bg-green-500', label: 'Exceeds Expectations' },
    { key: 'meets', color: 'bg-blue-500', label: 'Meets Expectations' },
    { key: 'needs_improvement', color: 'bg-yellow-500', label: 'Needs Improvement' },
    { key: 'unsatisfactory', color: 'bg-red-500', label: 'Unsatisfactory' },
  ];

  return (
    <div className="flex items-center gap-2">
      {ratings.map((r) => (
        <button
          key={r.key}
          type="button"
          title={r.label}
          onClick={() => onChange(r.key)}
          className={`h-7 w-7 rounded-full transition-all ${r.color} ${
            value === r.key
              ? 'ring-2 ring-offset-2 ring-primary scale-110'
              : 'opacity-50 hover:opacity-80 hover:scale-105'
          }`}
        />
      ))}
      {value && (
        <span className="text-xs text-muted-foreground ml-1">{RATING_CONFIG[value].label}</span>
      )}
    </div>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusVariant(status: string): 'warning' | 'secondary' | 'success' {
  switch (status) {
    case 'submitted':
      return 'warning';
    case 'approved':
    case 'in_progress':
      return 'secondary';
    case 'completed':
      return 'success';
    default:
      return 'secondary';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'submitted':
      return 'Submitted';
    case 'approved':
      return 'Approved';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'draft':
      return 'Draft';
    default:
      return status;
  }
}

const METRIC_ICONS: Record<string, typeof Hash> = {
  number: Hash,
  boolean: ToggleLeft,
  currency: DollarSign,
  tasks: ListChecks,
};

const METRIC_LABELS: Record<string, string> = {
  number: 'Number',
  boolean: 'True/False',
  currency: 'Currency',
  tasks: 'Tasks',
};

function getProgressBarColor(value: number): string {
  if (value >= 80) return 'bg-success';
  if (value >= 50) return 'bg-warning';
  return 'bg-error';
}

interface OKREvaluationTableProps {
  title: string;
  description: string;
  okrs: Array<OKR>;
  icon: ReactNode;
  onEvaluate: (okr: OKR) => void;
}

function OKREvaluationTable({
  title,
  description,
  okrs,
  icon,
  onEvaluate,
}: OKREvaluationTableProps): ReactNode {
  if (okrs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
          <Badge variant="secondary" className="ml-auto">
            {okrs.length}
          </Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {okrs.map((okr) => (
            <div
              key={okr.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 shrink-0">
                  <Target className="h-4 w-4 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{okr.objective}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      Employee: {okr.employeeId.slice(0, 8)}...
                    </span>
                    <span className="text-xs text-muted-foreground">Weight: {okr.weight}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(okr.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <div className="hidden sm:flex items-center gap-2">
                  <Progress value={okr.progressPercentage} className="h-2 w-16" />
                  <span className="text-xs text-muted-foreground w-8">
                    {okr.progressPercentage}%
                  </span>
                </div>
                <Badge variant={getStatusVariant(okr.status)}>{getStatusLabel(okr.status)}</Badge>
                <Button size="sm" variant="outline" onClick={() => onEvaluate(okr)}>
                  Evaluate
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================
// Target Evaluation Row
// =============================================

function TargetEvaluationRow({
  target,
  evaluation,
  onChange,
}: {
  target: OKRTarget;
  evaluation: TargetEvaluation;
  onChange: (eval_: TargetEvaluation) => void;
}): ReactNode {
  const Icon = METRIC_ICONS[target.metricType] || Hash;
  const displayValue =
    target.metricType === 'boolean'
      ? target.currentValue === 1
        ? 'Done'
        : 'Not Done'
      : `${target.currentValue} / ${target.targetValue}${target.unit ? ` ${target.unit}` : ''}`;

  return (
    <div className="p-3 rounded-lg border border-border space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{target.name}</p>
            {target.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{target.description}</p>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">
          {METRIC_LABELS[target.metricType] || target.metricType}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Progress
          value={Math.min(target.progressPercentage, 100)}
          className="h-2 flex-1"
          indicatorClassName={getProgressBarColor(target.progressPercentage)}
        />
        <span className="text-xs text-muted-foreground w-14 text-right">{displayValue}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <CompactRatingSelector
          value={evaluation.rating}
          onChange={(rating) => onChange({ ...evaluation, rating })}
        />
        <span className="text-xs text-muted-foreground">Weight: {target.weight}</span>
      </div>
    </div>
  );
}

// =============================================
// Main Page
// =============================================

export default function EvaluationsPage(): ReactNode {
  usePerformanceRealtime();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { data: cycles = [] } = usePerformanceCycles();
  const activeCycle = cycles.find((cycle) => cycle.status === 'active') || cycles[0] || null;
  const { data: okrs = [] } = usePerformanceOKRs(activeCycle?.id);
  const updateOKR = useUpdateOKR();
  const updateTarget = useUpdateOKRTarget();

  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  const [selectedOKR, setSelectedOKR] = useState<OKR | null>(null);
  const [selectedOkrId, setSelectedOkrId] = useState<string | undefined>(undefined);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [evalForm, setEvalForm] = useState<EvaluationFormState>(emptyEvaluation);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch targets for the selected OKR (hooks must be called at top level)
  const { data: selectedTargets = [] } = useOKRTargets(selectedOkrId);

  // Group OKRs by status
  const okrsForApproval = okrs.filter((okr) => okr.status === 'submitted');
  const okrsForReview = okrs.filter(
    (okr) => okr.status === 'approved' || okr.status === 'in_progress'
  );
  const okrsCompleted = okrs.filter((okr) => okr.status === 'completed');

  const handleEvaluateOKR = (okr: OKR): void => {
    setSelectedOKR(okr);
    setSelectedOkrId(okr.id);
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
      for (const target of selectedTargets) {
        const targetEval = evalForm.targetRatings[target.id];
        if (targetEval?.rating) {
          const targetPayload: Parameters<typeof updateTarget.mutateAsync>[0] = {
            id: target.id,
            okrId: selectedOKR.id,
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
        id: selectedOKR.id,
        status: 'completed',
        ...(evalForm.overallRating ? { adminRating: evalForm.overallRating } : {}),
        ...(evalForm.comments ? { adminComments: evalForm.comments } : {}),
        evaluatedBy: user.id,
        evaluatedAt: now,
      });

      addToast({
        title: 'Evaluation submitted',
        description: `Evaluation for "${selectedOKR.objective}" has been saved`,
        variant: 'success',
      });

      setEvaluationDialogOpen(false);
      setSelectedOKR(null);
      setSelectedOkrId(undefined);
      setModalStep(1);
      setEvalForm(emptyEvaluation);
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
    if (selectedTargets.length === 0) return true; // No targets to rate
    return selectedTargets.every((t) => evalForm.targetRatings[t.id]?.rating != null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/performance">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Performance Evaluations</h1>
            <p className="text-muted-foreground">
              Review and evaluate objectives and their targets
            </p>
          </div>
        </div>
      </div>

      {activeCycle && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">{activeCycle.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {formatDate(activeCycle.startDate)} - {formatDate(activeCycle.endDate)}
                </p>
              </div>
              <Badge variant={activeCycle.status === 'active' ? 'success' : 'secondary'}>
                {activeCycle.status === 'active' ? 'Active Cycle' : 'Cycle Not Active'}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  OKR Due
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {activeCycle.okrSubmissionDeadline
                    ? formatDate(activeCycle.okrSubmissionDeadline)
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  KPI Due
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {activeCycle.kpiSubmissionDeadline
                    ? formatDate(activeCycle.kpiSubmissionDeadline)
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Self-Assessment
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {activeCycle.selfAssessmentDeadline
                    ? formatDate(activeCycle.selfAssessmentDeadline)
                    : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OKR Tables by Status */}
      <div className="space-y-6">
        <OKREvaluationTable
          title="For Approval"
          description="Objectives submitted and awaiting admin approval"
          okrs={okrsForApproval}
          icon={<Clock className="h-4 w-4 text-warning" />}
          onEvaluate={handleEvaluateOKR}
        />

        <OKREvaluationTable
          title="For Review"
          description="Approved or in-progress objectives being reviewed"
          okrs={okrsForReview}
          icon={<FileSearch className="h-4 w-4 text-primary" />}
          onEvaluate={handleEvaluateOKR}
        />

        <OKREvaluationTable
          title="Completed"
          description="Objectives that have been completed and evaluated"
          okrs={okrsCompleted}
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          onEvaluate={handleEvaluateOKR}
        />

        {okrs.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No objectives found for the current cycle
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Evaluation Modal */}
      <Dialog open={evaluationDialogOpen} onOpenChange={setEvaluationDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Evaluate Objective - Step {modalStep} of 2
            </DialogTitle>
            <DialogDescription>
              {modalStep === 1
                ? 'Rate each target within this objective'
                : 'Provide your overall rating and feedback'}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className={`h-2 flex-1 rounded-full ${modalStep >= 1 ? 'bg-primary' : 'bg-muted'}`}
            />
            <div
              className={`h-2 flex-1 rounded-full ${modalStep >= 2 ? 'bg-primary' : 'bg-muted'}`}
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {/* Step 1: Rate each target */}
            {selectedOKR && modalStep === 1 && (
              <div className="space-y-3">
                {/* Objective Info */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground">
                    Objective
                  </p>
                  <p className="text-sm font-medium mt-0.5">{selectedOKR.objective}</p>
                  {selectedOKR.description && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedOKR.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={selectedOKR.progressPercentage} className="h-2 flex-1" />
                    <span className="text-xs font-medium">{selectedOKR.progressPercentage}%</span>
                  </div>
                </div>

                {/* Target Ratings */}
                {selectedTargets.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <ListChecks className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    No targets found for this objective
                  </div>
                ) : (
                  selectedTargets.map((target) => (
                    <TargetEvaluationRow
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
                  ))
                )}
              </div>
            )}

            {/* Step 2: Overall Rating & Comments */}
            {modalStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Overall Rating</Label>
                  <div className="grid gap-2">
                    {(Object.keys(RATING_CONFIG) as Array<PerformanceRating>).map((rating) => {
                      const config = RATING_CONFIG[rating];
                      return (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setEvalForm({ ...evalForm, overallRating: rating })}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                            evalForm.overallRating === rating
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className={`h-3 w-3 rounded-full shrink-0 ${config.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{config.label}</p>
                            <p className="text-xs text-muted-foreground">{config.description}</p>
                          </div>
                          {evalForm.overallRating === rating && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eval-comments">Comments</Label>
                  <Textarea
                    id="eval-comments"
                    placeholder="Provide feedback on this objective and the employee's performance..."
                    value={evalForm.comments}
                    onChange={(e) => setEvalForm({ ...evalForm, comments: e.target.value })}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {modalStep === 1 ? (
              <>
                <Button variant="outline" onClick={() => setEvaluationDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setModalStep(2)} disabled={!isStep1Valid()}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setModalStep(1)}>
                  Back
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
