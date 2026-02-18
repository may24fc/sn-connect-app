'use client';

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
  type KPI,
  type PerformanceRating,
  Progress,
  RATING_CONFIG,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { usePerformanceCycles, usePerformanceKPIs, usePerformanceOKRs, useUpdateKPI, useUpdateOKR } from '@/hooks/usePerformance';
import { usePerformanceRealtime } from '@/hooks/usePerformanceRealtime';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileSearch,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

type EvaluationType = 'okr' | 'kpi';

interface OKREvaluationFormState {
  objectiveRating: PerformanceRating | null;
  krRatings: Record<string, PerformanceRating | null>;
  overallRating: PerformanceRating | null;
  comments: string;
}

interface KPIEvaluationFormState {
  targetRating: PerformanceRating | null;
  overallRating: PerformanceRating | null;
  comments: string;
}

const emptyOKREvaluation: OKREvaluationFormState = {
  objectiveRating: null,
  krRatings: {},
  overallRating: null,
  comments: '',
};

const emptyKPIEvaluation: KPIEvaluationFormState = {
  targetRating: null,
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
        <span className="text-xs text-muted-foreground ml-1">
          {RATING_CONFIG[value].label}
        </span>
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
                <Badge variant={getStatusVariant(okr.status)}>
                  {getStatusLabel(okr.status)}
                </Badge>
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

interface KPIEvaluationTableProps {
  title: string;
  description: string;
  kpis: Array<KPI>;
  icon: ReactNode;
  onEvaluate: (kpi: KPI) => void;
}

function KPIEvaluationTable({
  title,
  description,
  kpis,
  icon,
  onEvaluate,
}: KPIEvaluationTableProps): ReactNode {
  if (kpis.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
          <Badge variant="secondary" className="ml-auto">
            {kpis.length}
          </Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {kpis.map((kpi) => (
            <div
              key={kpi.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 shrink-0">
                  <BarChart3 className="h-4 w-4 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{kpi.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      Employee: {kpi.employeeId.slice(0, 8)}...
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Target: {kpi.target} {kpi.unit} | Actual: {kpi.actual} {kpi.unit}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <div className="hidden sm:block">
                  <span className="text-sm font-medium">{kpi.score}%</span>
                </div>
                <Badge variant={kpi.score >= 100 ? 'success' : kpi.score >= 80 ? 'warning' : 'error'}>
                  {kpi.score >= 100 ? 'On Target' : kpi.score >= 80 ? 'Near Target' : 'Below'}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => onEvaluate(kpi)}>
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

export default function EvaluationsPage(): ReactNode {
  usePerformanceRealtime();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { data: cycles = [] } = usePerformanceCycles();
  const activeCycle = cycles.find((cycle) => cycle.status === 'active') || cycles[0] || null;
  const { data: okrs = [] } = usePerformanceOKRs(activeCycle?.id);
  const { data: kpis = [] } = usePerformanceKPIs(activeCycle?.id);
  const updateOKR = useUpdateOKR();
  const updateKPI = useUpdateKPI();

  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  const [selectedOKR, setSelectedOKR] = useState<OKR | null>(null);
  const [selectedKPI, setSelectedKPI] = useState<KPI | null>(null);
  const [evaluationType, setEvaluationType] = useState<EvaluationType>('okr');
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [okrEvalForm, setOkrEvalForm] = useState<OKREvaluationFormState>(emptyOKREvaluation);
  const [kpiEvalForm, setKpiEvalForm] = useState<KPIEvaluationFormState>(emptyKPIEvaluation);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group OKRs by status
  const okrsForApproval = okrs.filter((okr) => okr.status === 'submitted');
  const okrsForReview = okrs.filter(
    (okr) => okr.status === 'approved' || okr.status === 'in_progress'
  );
  const okrsCompleted = okrs.filter((okr) => okr.status === 'completed');

  // Group KPIs by status (now that we've added status tracking to KPIs)
  const kpisForReview = kpis.filter(
    (kpi) => !kpi.status || kpi.status === 'in_progress' || kpi.status === 'submitted'
  );
  const kpisCompleted = kpis.filter((kpi) => kpi.status === 'completed');

  const handleEvaluateOKR = (okr: OKR): void => {
    setSelectedOKR(okr);
    setSelectedKPI(null);
    setEvaluationType('okr');
    setModalStep(1);
    setOkrEvalForm(emptyOKREvaluation);
    setEvaluationDialogOpen(true);
  };

  const handleEvaluateKPI = (kpi: KPI): void => {
    setSelectedKPI(kpi);
    setSelectedOKR(null);
    setEvaluationType('kpi');
    setModalStep(1);
    setKpiEvalForm(emptyKPIEvaluation);
    setEvaluationDialogOpen(true);
  };

  const handleSubmitEvaluation = async (): Promise<void> => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      
      if (evaluationType === 'okr' && selectedOKR) {
        await updateOKR.mutateAsync({
          id: selectedOKR.id,
          status: 'completed',
          adminRating: okrEvalForm.overallRating || undefined,
          adminComments: okrEvalForm.comments || undefined,
          evaluatedBy: user.id,
          evaluatedAt: now,
        });

        addToast({
          title: 'OKR evaluated',
          description: `Evaluation for "${selectedOKR.objective}" has been submitted`,
          variant: 'success',
        });
      } else if (evaluationType === 'kpi' && selectedKPI) {
        await updateKPI.mutateAsync({
          id: selectedKPI.id,
          status: 'completed',
          adminRating: kpiEvalForm.overallRating || undefined,
          adminComments: kpiEvalForm.comments || undefined,
          evaluatedBy: user.id,
          evaluatedAt: now,
        });

        addToast({
          title: 'KPI evaluated',
          description: `Evaluation for "${selectedKPI.name}" has been submitted`,
          variant: 'success',
        });
      }
      
      // Close dialog and reset state
      setEvaluationDialogOpen(false);
      setSelectedOKR(null);
      setSelectedKPI(null);
      setModalStep(1);
      setOkrEvalForm(emptyOKREvaluation);
      setKpiEvalForm(emptyKPIEvaluation);
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

  const isOKRStep1Valid = (): boolean => {
    if (!selectedOKR) return false;
    if (!okrEvalForm.objectiveRating) return false;
    return selectedOKR.keyResults.every((kr) => okrEvalForm.krRatings[kr.id] != null);
  };

  const isKPIStep1Valid = (): boolean => {
    return kpiEvalForm.targetRating !== null;
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
              Review and evaluate OKR and KPI submissions
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="okrs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="okrs" className="gap-1.5">
            <Target className="h-4 w-4" />
            OKRs
            {okrs.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {okrs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="kpis" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            KPIs
            {kpis.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {kpis.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* OKRs Tab */}
        <TabsContent value="okrs" className="space-y-6">
          <OKREvaluationTable
            title="For Approval"
            description="OKRs submitted and awaiting admin approval"
            okrs={okrsForApproval}
            icon={<Clock className="h-4 w-4 text-warning" />}
            onEvaluate={handleEvaluateOKR}
          />

          <OKREvaluationTable
            title="For Review"
            description="Approved or in-progress OKRs being reviewed"
            okrs={okrsForReview}
            icon={<FileSearch className="h-4 w-4 text-primary" />}
            onEvaluate={handleEvaluateOKR}
          />

          <OKREvaluationTable
            title="Completed"
            description="OKRs that have been completed"
            okrs={okrsCompleted}
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            onEvaluate={handleEvaluateOKR}
          />

          {okrs.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No OKRs found for the current cycle
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-6">
          <KPIEvaluationTable
            title="For Review"
            description="KPIs submitted for evaluation"
            kpis={kpisForReview}
            icon={<FileSearch className="h-4 w-4 text-primary" />}
            onEvaluate={handleEvaluateKPI}
          />

          <KPIEvaluationTable
            title="Completed"
            description="KPIs that have been evaluated"
            kpis={kpisCompleted}
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            onEvaluate={handleEvaluateKPI}
          />

          {kpis.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No KPIs found for the current cycle
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Evaluation Modal */}
      <Dialog open={evaluationDialogOpen} onOpenChange={setEvaluationDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              {evaluationType === 'okr'
                ? `Evaluate OKR - Step ${modalStep} of 2`
                : `Evaluate KPI - Step ${modalStep} of 2`}
            </DialogTitle>
            <DialogDescription>
              {modalStep === 1
                ? evaluationType === 'okr'
                  ? 'Rate the objective and each key result'
                  : 'Rate the target achievement for this metric'
                : 'Provide your overall rating and feedback'}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-4">
            <div className={`h-2 flex-1 rounded-full ${modalStep >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 flex-1 rounded-full ${modalStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {/* OKR Step 1: Rate Objective & Key Results */}
            {evaluationType === 'okr' && selectedOKR && modalStep === 1 && (
              <div className="space-y-3">
                {/* Objective Rating */}
                <div className="p-3 rounded-lg border border-border space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Objective</p>
                  <p className="text-sm font-medium">{selectedOKR.objective}</p>
                  <CompactRatingSelector
                    value={okrEvalForm.objectiveRating}
                    onChange={(rating) =>
                      setOkrEvalForm({ ...okrEvalForm, objectiveRating: rating })
                    }
                  />
                </div>

                {/* Key Result Ratings */}
                {selectedOKR.keyResults.map((kr, index) => (
                  <div key={kr.id} className="p-3 rounded-lg border border-border space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Key Result {index + 1}
                    </p>
                    <p className="text-sm font-medium">{kr.description}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={kr.progressPercentage} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground shrink-0">
                        {kr.progressPercentage}%
                      </span>
                    </div>
                    <CompactRatingSelector
                      value={okrEvalForm.krRatings[kr.id] ?? null}
                      onChange={(rating) =>
                        setOkrEvalForm({
                          ...okrEvalForm,
                          krRatings: { ...okrEvalForm.krRatings, [kr.id]: rating },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {/* KPI Step 1: Rate Target Achievement */}
            {evaluationType === 'kpi' && selectedKPI && modalStep === 1 && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Metric</p>
                    <p className="text-sm font-medium mt-0.5">{selectedKPI.name}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Target: </span>
                      <span className="font-medium">{selectedKPI.target} {selectedKPI.unit}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Actual: </span>
                      <span className="font-medium">{selectedKPI.actual} {selectedKPI.unit}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Score: </span>
                      <span className="font-medium">{selectedKPI.score}%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Rate Target Achievement</p>
                    <CompactRatingSelector
                      value={kpiEvalForm.targetRating}
                      onChange={(rating) =>
                        setKpiEvalForm({ ...kpiEvalForm, targetRating: rating })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Overall Rating & Comments (shared for OKR and KPI) */}
            {modalStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Overall Rating</Label>
                  <div className="grid gap-2">
                    {(Object.keys(RATING_CONFIG) as Array<PerformanceRating>).map((rating) => {
                      const config = RATING_CONFIG[rating];
                      const currentOverall =
                        evaluationType === 'okr'
                          ? okrEvalForm.overallRating
                          : kpiEvalForm.overallRating;
                      return (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => {
                            if (evaluationType === 'okr') {
                              setOkrEvalForm({ ...okrEvalForm, overallRating: rating });
                            } else {
                              setKpiEvalForm({ ...kpiEvalForm, overallRating: rating });
                            }
                          }}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                            currentOverall === rating
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className={`h-3 w-3 rounded-full shrink-0 ${config.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{config.label}</p>
                            <p className="text-xs text-muted-foreground">{config.description}</p>
                          </div>
                          {currentOverall === rating && (
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
                    placeholder="Provide feedback on this submission..."
                    value={evaluationType === 'okr' ? okrEvalForm.comments : kpiEvalForm.comments}
                    onChange={(e) => {
                      if (evaluationType === 'okr') {
                        setOkrEvalForm({ ...okrEvalForm, comments: e.target.value });
                      } else {
                        setKpiEvalForm({ ...kpiEvalForm, comments: e.target.value });
                      }
                    }}
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
                <Button
                  onClick={() => setModalStep(2)}
                  disabled={evaluationType === 'okr' ? !isOKRStep1Valid() : !isKPIStep1Valid()}
                >
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
                  onClick={handleSubmitEvaluation}
                  disabled={
                    isSubmitting ||
                    (evaluationType === 'okr'
                      ? !okrEvalForm.overallRating
                      : !kpiEvalForm.overallRating)
                  }
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
