'use client';

import { useCreateOKR, usePerformanceCycles, usePerformanceOKRs } from '@/hooks/usePerformance';
import { usePerformanceRealtime } from '@/hooks/usePerformanceRealtime';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Progress,
  ProgressGauge,
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
import { type ReactNode, useState } from 'react';

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
  const activeCycle = cycles.find((cycle) => cycle.status === 'active') || cycles[0] || null;
  const { data: okrs = [] } = usePerformanceOKRs(activeCycle?.id);
  const createOKR = useCreateOKR();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formState, setFormState] = useState<CreateObjectiveFormState>(emptyForm);

  // Calculate overall weighted progress across all objectives
  const totalWeight = okrs.reduce((sum, okr) => sum + (okr.weight || 1), 0);
  const overallProgress =
    totalWeight > 0
      ? Math.round(
          okrs.reduce((sum, okr) => sum + okr.progressPercentage * (okr.weight || 1), 0) /
            totalWeight
        )
      : 0;

  const stats = {
    total: okrs.length,
    inProgress: okrs.filter((o) => o.status === 'in_progress').length,
    completed: okrs.filter((o) => o.status === 'completed').length,
  };

  const handleOpenCreate = (): void => {
    setFormState({
      ...emptyForm,
      cycleId: activeCycle?.id || '',
    });
    setCreateDialogOpen(true);
  };

  const handleCreateObjective = async (): Promise<void> => {
    if (!formState.objective.trim()) return;

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
          <h1 className="text-2xl font-bold text-foreground">Performance</h1>
          <p className="text-muted-foreground">Track your objectives, targets, and KPIs</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Objective
        </Button>
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
                <h2 className="font-semibold">{activeCycle?.name || 'No Active Cycle'}</h2>
                <p className="text-sm text-muted-foreground">
                  {activeCycle
                    ? `${formatDate(activeCycle.startDate)} - ${formatDate(activeCycle.endDate)}`
                    : 'No performance cycle has been created yet'}
                </p>
                {activeCycle && (
                  <p className="text-xs font-medium text-primary mt-0.5">
                    {getQuarterLabel(activeCycle.startDate)}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={activeCycle ? 'success' : 'secondary'}>
              {activeCycle ? 'Active Cycle' : 'No Cycle'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Overall Progress + Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Overall Weighted Progress */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overall Score</CardTitle>
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
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-3">
              <div className="text-center p-3 rounded-lg bg-primary/5">
                <p className="text-3xl font-bold text-primary">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Objectives</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-warning/5">
                <p className="text-3xl font-bold text-warning">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground mt-1">In Progress</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-success/5">
                <p className="text-3xl font-bold text-success">{stats.completed}</p>
                <p className="text-xs text-muted-foreground mt-1">Completed</p>
              </div>
            </div>

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
          </h2>
        </div>

        {okrs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No objectives yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first objective, then add targets and KPIs to track your progress.
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Objective
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {okrs.map((okr) => {
              const weightPct = totalWeight > 0 ? Math.round((okr.weight / totalWeight) * 100) : 0;
              return (
                <Link key={okr.id} href={`/performance/okrs/${okr.id}`} className="block">
                  <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Progress circle + info */}
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="shrink-0">
                            <div className="relative h-14 w-14">
                              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
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
                              <Badge
                                variant={
                                  okr.status === 'completed'
                                    ? 'success'
                                    : okr.status === 'in_progress'
                                      ? 'warning'
                                      : 'secondary'
                                }
                                className="text-xs"
                              >
                                {okr.status === 'in_progress'
                                  ? 'In Progress'
                                  : okr.status.charAt(0).toUpperCase() + okr.status.slice(1)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Weight: {weightPct}%
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
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
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
                    {cycles.map((cycle) => (
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
                <Input
                  id="weight"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="1"
                  value={formState.weight}
                  onChange={(e) => setFormState({ ...formState, weight: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  How much this objective counts toward your overall score. Higher = more impact.
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
              disabled={!formState.objective.trim() || createOKR.isPending}
            >
              {createOKR.isPending ? 'Creating...' : 'Create Objective'}
            </Button>
          </SlidePanelFooter>
        </SlidePanelContent>
      </SlidePanel>
    </div>
  );
}
