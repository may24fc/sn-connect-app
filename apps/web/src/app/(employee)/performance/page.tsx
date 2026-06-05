'use client';

import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { useCreateOKR, usePerformanceCycles, usePerformanceOKRs } from '@/hooks/usePerformance';
import { usePerformanceRealtime } from '@/hooks/usePerformanceRealtime';
import { getDisplayOKRStatus } from '@/lib/performance/okr-status';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  HelpLink,
  Input,
  Label,
  OKRStatusBadge,
  type PerformanceRating,
  Progress,
  ProgressGauge,
  RATING_CONFIG,
  SectionTooltip,
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
import { Calendar, ChevronRight, Plus, Target } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState, useEffect } from 'react';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getQuarterLabel(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth();
  const year = date.getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  const quarterMonths: Record<number, string> = {
    1: 'January - March',
    2: 'April - June',
    3: 'July - September',
    4: 'October - December',
  };
  return `Q${quarter}: ${quarterMonths[quarter]} ${year}`;
}

function getProgressBarColor(value: number): string {
  if (value >= 80) return 'bg-success';
  if (value >= 50) return 'bg-warning';
  return 'bg-error';
}

function getProgressColor(value: number): string {
  if (value >= 80) return 'text-success';
  if (value >= 50) return 'text-warning';
  return 'text-error';
}

function formatRatingLabel(rating: PerformanceRating | undefined): string | null {
  if (!rating) {
    return null;
  }

  const config = RATING_CONFIG[rating];
  return `${config.label} (${config.score}/5)`;
}

interface CreateObjectiveFormState {
  objective: string;
  description: string;
  cycleId: string;
  weight: string;
}

const emptyForm: CreateObjectiveFormState = {
  objective: '',
  description: '',
  cycleId: '',
  weight: '1',
};

export default function PerformancePage(): ReactNode {
  usePerformanceRealtime();
  const { addToast } = useToast();
  const { data: cycles = [] } = usePerformanceCycles();
  const activeCycle = cycles.find((cycle) => cycle.status === 'active') || null;
  const fallbackCycle = activeCycle || cycles[0] || null;
  const activeCycles = cycles.filter((cycle) => cycle.status === 'active');
  const canCreateObjective = Boolean(activeCycle);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const displayCycle =
    cycles.find((cycle) => cycle.id === selectedCycleId) || fallbackCycle || null;
  useEffect(() => {
    if (selectedCycleId) return;
    if (fallbackCycle) {
      setSelectedCycleId(fallbackCycle.id);
    }
  }, [fallbackCycle, selectedCycleId]);
  const { data: okrs = [] } = usePerformanceOKRs(selectedCycleId || displayCycle?.id);
  const { data: allOkrs = [], isLoading: isLoadingAllOkrs } = usePerformanceOKRs();
  const createOKR = useCreateOKR();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formState, setFormState] = useState<CreateObjectiveFormState>(emptyForm);
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all');

  // Calculate overall weighted progress across all objectives
  const totalWeight = okrs.reduce((sum, okr) => sum + (okr.weight || 1), 0);
  const selectedCycleIdForWeight = formState.cycleId || activeCycle?.id || '';
  const selectedCycleWeight = selectedCycleIdForWeight
    ? allOkrs
        .filter((okr) => okr.cycleId === selectedCycleIdForWeight)
        .reduce((sum, okr) => sum + (okr.weight || 1), 0)
    : 0;
  const remainingObjectiveWeight = Math.max(
    0,
    Math.round((100 - selectedCycleWeight) * 100) / 100
  );
  const enteredObjectiveWeight = Number(formState.weight);
  const objectiveWeightExceedsRemaining =
    formState.weight !== '' && enteredObjectiveWeight > remainingObjectiveWeight;
  const objectiveWeightInvalid =
    !formState.weight ||
    enteredObjectiveWeight <= 0 ||
    objectiveWeightExceedsRemaining ||
    isLoadingAllOkrs;
  const overallProgress =
    totalWeight > 0
      ? Math.round(
          okrs.reduce((sum, okr) => sum + okr.progressPercentage * (okr.weight || 1), 0) /
            totalWeight
        )
      : 0;

  const stats = {
    total: okrs.length,
    inProgress: okrs.filter(
      (o) => getDisplayOKRStatus(o.status, o.progressPercentage) === 'in_progress'
    ).length,
    completed: okrs.filter(
      (o) => getDisplayOKRStatus(o.status, o.progressPercentage) === 'completed'
    ).length,
  };

  const handleOpenCreate = (): void => {
    if (!activeCycle) return;

    setFormState({
      ...emptyForm,
      cycleId: activeCycle.id,
    });
    setCreateDialogOpen(true);
  };

  const handleCreateObjective = async (): Promise<void> => {
    if (!activeCycle || !formState.objective.trim() || objectiveWeightInvalid) return;

    const selectedCycleId = formState.cycleId || activeCycle?.id;

    try {
      const payload: Parameters<typeof createOKR.mutateAsync>[0] = {
        objective: formState.objective,
        keyResults: [],
        progress: 0,
        status: 'in_progress',
        weight: Number(formState.weight) || 1,
      };
      const desc = formState.description.trim();
      if (desc) payload.description = desc;
      if (selectedCycleId) payload.cycleId = selectedCycleId;

      await createOKR.mutateAsync(payload);

      addToast({
        title: 'Objective created',
        description: 'Click on it to add targets and KPIs',
        variant: 'success',
      });

      setCreateDialogOpen(false);
      setFormState(emptyForm);
    } catch {
      addToast({
        title: 'Error',
        description: 'Failed to create objective',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold text-foreground">OKRs &amp; KPIs</h1>
            <SectionTooltip content="Track your objectives, targets, KPIs, and review-cycle progress in one workspace." />
          </div>
          <p className="text-muted-foreground">Track your objectives, targets, and KPI progress</p>
          <HelpLink href="/help/performance-reviews" label="OKRs & KPIs FAQ" LinkComponent={Link} />
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Button onClick={handleOpenCreate} disabled={!canCreateObjective}>
            <Plus className="mr-2 h-4 w-4" />
            New Objective
          </Button>
          {!canCreateObjective && (
            <p className="text-xs text-muted-foreground">
              Objective creation is unavailable until an active cycle is set.
            </p>
          )}
        </div>
      </div>

      {/* Current Cycle Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">{displayCycle?.name || 'No Active Cycle'}</h2>
                <p className="text-sm text-muted-foreground">
                  {displayCycle
                    ? `${formatDate(displayCycle.startDate)} - ${formatDate(displayCycle.endDate)}`
                    : 'No performance cycle has been created yet'}
                </p>
                {displayCycle && (
                  <p className="text-xs font-medium text-primary mt-0.5">
                    {getQuarterLabel(displayCycle.startDate)}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={activeCycle ? 'success' : 'secondary'}>
              {activeCycle ? 'Active Cycle' : displayCycle ? 'Cycle Not Active' : 'No Active Cycle'}
            </Badge>
          </div>
          {displayCycle && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  OKR Due
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {displayCycle.okrSubmissionDeadline
                    ? formatDate(displayCycle.okrSubmissionDeadline)
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  KPI Due
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {displayCycle.kpiSubmissionDeadline
                    ? formatDate(displayCycle.kpiSubmissionDeadline)
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Self-Assessment
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {displayCycle.selfAssessmentDeadline
                    ? formatDate(displayCycle.selfAssessmentDeadline)
                    : 'Not set'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall Progress + Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Overall Weighted Progress */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">Overall Score <SectionTooltip content="Your weighted score based on all objectives in the current cycle." /></CardTitle>
            <CardDescription>Weighted average across all objectives</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-4">
            <ProgressGauge value={overallProgress} label="Overall Progress" size="lg" />
            <p className="text-sm text-muted-foreground mt-2">
              {okrs.length} objective{okrs.length !== 1 ? 's' : ''} &middot; {stats.completed}{' '}
              completed
            </p>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">Summary <SectionTooltip content="Quick stats: total objectives, completed, and in-progress counts." /></CardTitle>
          </CardHeader>
          <CardContent>
            <StatCardGrid columns={3}>
              <StatCard
                label="Objectives"
                value={stats.total}
                icon={<Target className="h-4 w-4" strokeWidth={1.5} />}
                compact
              />
              <StatCard
                label="In Progress"
                value={stats.inProgress}
                icon={<Calendar className="h-4 w-4" strokeWidth={1.5} />}
                compact
              />
              <StatCard
                label="Completed"
                value={stats.completed}
                icon={<Target className="h-4 w-4" strokeWidth={1.5} />}
                compact
              />
            </StatCardGrid>

            {/* Weight distribution bar */}
            {okrs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2 font-medium">
                  Weight Distribution
                </p>
                <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-muted">
                  {okrs.map((okr) => {
                    const weightPct = totalWeight > 0 ? (okr.weight / totalWeight) * 100 : 0;
                    return (
                      <div
                        key={okr.id}
                        className={`${getProgressBarColor(okr.progressPercentage)} opacity-70 hover:opacity-100 transition-opacity`}
                        style={{ width: `${weightPct}%` }}
                        title={`${okr.objective}: weight ${okr.weight} (${Math.round(weightPct)}%)`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Objectives List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objectives
            <SectionTooltip content="OKRs you've set for the current review cycle. Progress auto-calculates from key results." />
          </h2>
          <div className="flex items-center gap-2">
            <Select
              value={selectedCycleId}
              onValueChange={setSelectedCycleId}
              disabled={cycles.length === 0}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter cycle" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {okrs.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Target}
                title="No objectives yet"
                description={
                  canCreateObjective
                    ? 'Create your first objective, then add targets and KPIs to track your progress.'
                    : 'Objective creation is disabled until an active review cycle is available.'
                }
                action={{
                  label: 'Create objective',
                  onClick: handleOpenCreate,
                  icon: <Plus className="h-4 w-4" />,
                  disabled: !canCreateObjective,
                }}
                size="md"
              />
            </CardContent>
          </Card>
        ) : (() => {
          const filteredOkrs =
            statusFilter === 'all'
              ? okrs
              : okrs.filter(
                  (o) => getDisplayOKRStatus(o.status, o.progressPercentage) === statusFilter
                );
          return filteredOkrs.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={Target}
                  title="No objectives match the selected filter"
                  description="Adjust the status filter to widen the objective list."
                  size="sm"
                />
              </CardContent>
            </Card>
          ) : (
          <div className="space-y-3">
            {filteredOkrs.map((okr) => {
              const displayStatus = getDisplayOKRStatus(okr.status, okr.progressPercentage);
              const objectiveRating = formatRatingLabel(okr.adminRating);

              return (
                <Link key={okr.id} href={`/performance/okrs/${okr.id}`} className="block">
                  <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Progress circle + info */}
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="shrink-0">
                            <div className="relative h-14 w-14">
                              <svg aria-hidden="true" className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                                <circle
                                  cx="28"
                                  cy="28"
                                  r="24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  className="text-muted/30"
                                />
                                <circle
                                  cx="28"
                                  cy="28"
                                  r="24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  strokeDasharray={`${(okr.progressPercentage / 100) * 150.8} 150.8`}
                                  strokeLinecap="round"
                                  className={getProgressColor(okr.progressPercentage)}
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-bold">{okr.progressPercentage}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {okr.objective}
                            </h3>
                            {okr.description && (
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                                {okr.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <OKRStatusBadge
                                status={displayStatus}
                                className="text-xs"
                              />
                              <span className="text-xs text-muted-foreground">
                                Weight: {okr.weight}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>

                      <div className="mt-3">
                        <Progress
                          value={okr.progressPercentage}
                          className="h-2"
                          indicatorClassName={getProgressBarColor(okr.progressPercentage)}
                        />
                      </div>

                      {(objectiveRating || okr.adminComments) && (
                        <div className="mt-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2">
                          <p className="text-xs font-medium text-primary">
                            {objectiveRating ? `Admin feedback: ${objectiveRating}` : 'Admin feedback'}
                          </p>
                          {okr.adminComments && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {okr.adminComments}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
          );
        })()}
      </div>

      {/* Create Objective — Slide Panel */}
      <SlidePanel open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <SlidePanelContent size="lg">
          <SlidePanelHeader>
            <SlidePanelTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              Create New Objective
            </SlidePanelTitle>
            <SlidePanelDescription>
              Define an objective, then add targets and KPIs inside it.
            </SlidePanelDescription>
          </SlidePanelHeader>

          <SlidePanelBody className="space-y-6">
            {/* ── Context ─────────────────────────────────── */}
            <SlidePanelSection label="Context">
              <div className="space-y-1.5">
                <Label htmlFor="cycle" className="text-sm font-medium">
                  Performance Cycle
                </Label>
                <Select
                  value={formState.cycleId}
                  onValueChange={(value) => setFormState({ ...formState, cycleId: value })}
                >
                  <SelectTrigger id="cycle">
                    <SelectValue placeholder="Select a cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCycles.map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{cycle.name}</span>
                          {cycle.status === 'active' && (
                            <span className="text-xs text-success font-medium">(Active)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </SlidePanelSection>

            {/* ── Objective Details ────────────────────────── */}
            <SlidePanelSection label="Objective">
              <div className="space-y-1.5">
                <Label htmlFor="objective" className="text-sm font-medium">
                  What do you want to achieve?
                </Label>
                <Input
                  id="objective"
                  placeholder="e.g., Increase monthly VP points to 2,000"
                  value={formState.objective}
                  onChange={(e) => setFormState({ ...formState, objective: e.target.value })}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Write a concise, outcome-oriented statement
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium">
                  Why does this matter?
                  <span className="ml-1 text-xs font-normal text-muted-foreground">Optional</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Add context so your team understands the purpose behind this goal..."
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  className="min-h-[72px] resize-none"
                />
              </div>
            </SlidePanelSection>

            {/* ── Weight ───────────────────────────────── */}
            <SlidePanelSection label="Priority">
              <div className="space-y-1.5">
                <Label htmlFor="weight" className="text-sm font-medium">
                  Weight
                </Label>
                <div className="relative">
                  <Input
                    id="weight"
                    type="number"
                    min="1"
                    max={remainingObjectiveWeight}
                    step="1"
                    placeholder={remainingObjectiveWeight > 0 ? String(remainingObjectiveWeight) : '0'}
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
                    objectiveWeightExceedsRemaining ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {isLoadingAllOkrs
                    ? 'Checking cycle allocation...'
                    : !canCreateObjective
                    ? 'Ask HR or an admin to activate a review cycle before creating objectives.'
                    : remainingObjectiveWeight <= 0
                    ? '100% already allocated across objectives'
                    : `${remainingObjectiveWeight}% available in this cycle. Higher = more impact.`}
                </p>
              </div>
            </SlidePanelSection>
          </SlidePanelBody>

          <SlidePanelFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleCreateObjective();
              }}
              disabled={
                !canCreateObjective ||
                !formState.objective.trim() ||
                objectiveWeightInvalid ||
                createOKR.isPending
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              {createOKR.isPending ? 'Creating...' : 'Create Objective'}
            </Button>
          </SlidePanelFooter>
        </SlidePanelContent>
      </SlidePanel>
    </div>
  );
}
