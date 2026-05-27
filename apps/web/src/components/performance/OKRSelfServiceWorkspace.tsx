'use client';

import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import {
  useCreateOKR,
  useMyPerformanceOKRs,
  usePerformanceCycles,
  useUpdateOKR,
} from '@/hooks/usePerformance';
import { usePerformanceRealtime } from '@/hooks/usePerformanceRealtime';
import { formatDate } from '@/lib/format';
import { getDisplayOKRStatus } from '@/lib/performance/okr-status';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Label,
  OKRList,
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
import { ArrowLeft, Calendar, Filter, ListChecks, Plus, Target, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

interface NewOKRFormState {
  objective: string;
  description: string;
  cycleId: string;
  kr1: string;
  kr2: string;
  kr3: string;
  subtasks: Array<string>;
  deadline: string;
}

const emptyForm: NewOKRFormState = {
  objective: '',
  description: '',
  cycleId: '',
  kr1: '',
  kr2: '',
  kr3: '',
  subtasks: [],
  deadline: '',
};

export interface OKRSelfServiceWorkspaceProps {
  fallbackPath: string;
}

export function OKRSelfServiceWorkspace({ fallbackPath }: OKRSelfServiceWorkspaceProps): ReactNode {
  usePerformanceRealtime();
  const handleBack = useBackNavigation({ fallbackPath });
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const { data: cycles = [] } = usePerformanceCycles();
  const activeCycle = cycles.find((cycle) => cycle.status === 'active') || null;
  const displayCycle = activeCycle || cycles[0] || null;
  const activeCycles = cycles.filter((cycle) => cycle.status === 'active');
  const canCreateObjective = Boolean(activeCycle);
  const { data: okrs = [] } = useMyPerformanceOKRs(displayCycle?.id);
  const createOKR = useCreateOKR();
  const updateOKR = useUpdateOKR();

  const currentOKRs = okrs;

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOKR, setNewOKR] = useState<NewOKRFormState>(emptyForm);
  const [subtaskInput, setSubtaskInput] = useState('');
  const handledCreateDeepLinkRef = useRef(false);

  const displayOKRs = currentOKRs.map((okr) => ({
    ...okr,
    status: getDisplayOKRStatus(okr.status, okr.progressPercentage),
  }));

  const filteredOKRs = displayOKRs.filter((okr) => {
    if (statusFilter === 'all') return true;
    return okr.status === statusFilter;
  });

  const stats = {
    total: displayOKRs.length,
    inProgress: displayOKRs.filter((o) => o.status === 'in_progress').length,
    completed: displayOKRs.filter((o) => o.status === 'completed').length,
    avgProgress: Math.round(
      currentOKRs.reduce((sum, o) => sum + o.progressPercentage, 0) /
        Math.max(currentOKRs.length, 1)
    ),
  };

  const handleUpdateKeyResult = (okrId: string, keyResultId: string, value: number): void => {
    const okr = currentOKRs.find((o) => o.id === okrId);
    if (!okr) return;

    const updatedKeyResults = okr.keyResults.map((kr) => {
      if (kr.id === keyResultId) {
        return {
          ...kr,
          currentValue: value,
          progressPercentage: Math.round((value / kr.targetValue) * 100),
        };
      }
      return kr;
    });

    const overallProgress = Math.round(
      updatedKeyResults.reduce((sum, kr) => sum + kr.progressPercentage * (kr.weight || 1), 0) /
        Math.max(
          updatedKeyResults.reduce((sum, kr) => sum + (kr.weight || 1), 0),
          1
        )
    );

    updateOKR.mutate(
      {
        id: okrId,
        keyResults: updatedKeyResults as unknown as Array<Record<string, unknown>>,
        progress: overallProgress,
      },
      {
        onSuccess: () => {
          addToast({
            title: 'Progress updated',
            description: 'Key result progress has been saved',
            variant: 'success',
          });
        },
        onError: () => {
          addToast({
            title: 'Error',
            description: 'Failed to update progress',
            variant: 'error',
          });
        },
      }
    );
  };

  const handleAddSubtask = (): void => {
    const trimmed = subtaskInput.trim();
    if (!trimmed) return;
    setNewOKR((prev) => ({ ...prev, subtasks: [...prev.subtasks, trimmed] }));
    setSubtaskInput('');
  };

  const handleRemoveSubtask = (index: number): void => {
    setNewOKR((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, i) => i !== index),
    }));
  };

  const handleSubtaskKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddSubtask();
    }
  };

  const handleCreateOKR = async (): Promise<void> => {
    if (!activeCycle || !newOKR.objective.trim() || !newOKR.kr1.trim() || !newOKR.kr2.trim()) {
      return;
    }

    const selectedCycleId = newOKR.cycleId || activeCycle.id;
    const hasKr3 = newOKR.kr3.trim().length > 0;

    const keyResults: Array<{
      description: string;
      targetValue: number;
      currentValue: number;
      unit: string;
      weight: number;
      progressPercentage: number;
    }> = [
      {
        description: newOKR.kr1,
        targetValue: 100,
        currentValue: 0,
        unit: '%',
        weight: hasKr3 ? 33 : 50,
        progressPercentage: 0,
      },
      {
        description: newOKR.kr2,
        targetValue: 100,
        currentValue: 0,
        unit: '%',
        weight: hasKr3 ? 33 : 50,
        progressPercentage: 0,
      },
      ...(hasKr3
        ? [
            {
              description: newOKR.kr3,
              targetValue: 100,
              currentValue: 0,
              unit: '%',
              weight: 34,
              progressPercentage: 0,
            },
          ]
        : []),
    ];

    const payload: {
      objective: string;
      keyResults: Array<{
        description: string;
        targetValue: number;
        currentValue: number;
        unit: string;
        weight: number;
        progressPercentage: number;
      }>;
      progress: number;
      status: string;
      cycleId?: string;
    } = {
      objective: newOKR.objective,
      keyResults,
      progress: 0,
      status: 'in_progress',
      ...(selectedCycleId ? { cycleId: selectedCycleId } : {}),
    };

    try {
      await createOKR.mutateAsync(payload);

      addToast({
        title: 'OKR created',
        description: 'Your objective has been successfully created',
        variant: 'success',
      });

      setCreateDialogOpen(false);
      setNewOKR(emptyForm);
      setSubtaskInput('');
    } catch {
      addToast({
        title: 'Error',
        description: 'Failed to create OKR',
        variant: 'error',
      });
    }
  };

  const handleOpenCreate = useCallback((): void => {
    if (!activeCycle) return;

    setNewOKR({
      ...emptyForm,
      cycleId: activeCycle.id,
    });
    setSubtaskInput('');
    setCreateDialogOpen(true);
  }, [activeCycle]);

  useEffect(() => {
    if (handledCreateDeepLinkRef.current) return;
    if (searchParams.get('create') !== '1') return;
    if (!activeCycle) return;

    handledCreateDeepLinkRef.current = true;
    handleOpenCreate();
  }, [activeCycle, handleOpenCreate, searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My OKRs &amp; KPIs</h1>
            <p className="text-muted-foreground">
              Manage your objectives, key results, and KPI progress
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Button onClick={handleOpenCreate} disabled={!canCreateObjective}>
            <Plus className="mr-2 h-4 w-4" />
            New Objective
          </Button>
          {!canCreateObjective && (
            <p className="text-xs text-muted-foreground">
              You need an active cycle before you can create an objective.
            </p>
          )}
        </div>
      </div>

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
                  Review Due
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

      <StatCardGrid columns={4}>
        <StatCard
          label="Total OKRs"
          value={stats.total}
          icon={<Target className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={<Target className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<Target className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Avg Progress"
          value={`${stats.avgProgress}%`}
          icon={<Target className="h-4 w-4" strokeWidth={1.5} />}
        />
      </StatCardGrid>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {filteredOKRs.length === 0 ? (
        <EmptyState
          icon={Target}
          title={
            statusFilter !== 'all' ? 'No OKRs match the selected filter' : 'No OKRs created yet'
          }
          description={
            statusFilter !== 'all'
              ? 'Adjust the status filter to widen the OKR list.'
              : canCreateObjective
                ? 'Click "New Objective" to create your first OKR and start tracking progress.'
                : 'Objective creation is disabled until an active review cycle is available.'
          }
          size="md"
        />
      ) : (
        <OKRList
          okrs={filteredOKRs}
          readonly={false}
          onUpdateKeyResult={handleUpdateKeyResult}
          emptyMessage=""
        />
      )}

      <SlidePanel open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <SlidePanelContent size="xl">
          <SlidePanelHeader>
            <SlidePanelTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              Create New Objective
            </SlidePanelTitle>
            <SlidePanelDescription>
              Define a clear objective and break it into measurable key results.
            </SlidePanelDescription>
          </SlidePanelHeader>

          <SlidePanelBody className="space-y-6">
            <SlidePanelSection label="Context">
              <div className="space-y-1.5">
                <Label htmlFor="cycle" className="text-sm font-medium">
                  Performance Cycle
                </Label>
                <Select
                  value={newOKR.cycleId}
                  onValueChange={(value) => setNewOKR({ ...newOKR, cycleId: value })}
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

            <SlidePanelSection label="Objective">
              <div className="space-y-1.5">
                <Label htmlFor="objective" className="text-sm font-medium">
                  What do you want to achieve?
                </Label>
                <Input
                  id="objective"
                  placeholder="e.g., Improve customer satisfaction rating"
                  value={newOKR.objective}
                  onChange={(event) => setNewOKR({ ...newOKR, objective: event.target.value })}
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
                  value={newOKR.description}
                  onChange={(event) => setNewOKR({ ...newOKR, description: event.target.value })}
                  className="min-h-[72px] resize-none"
                />
              </div>
            </SlidePanelSection>

            <SlidePanelSection label="Key Results">
              <p className="text-xs text-muted-foreground -mt-1">
                How will you measure success? Add 2-3 measurable outcomes.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-xs font-semibold text-primary">
                    1
                  </span>
                  <div className="flex-1 space-y-1">
                    <Input
                      id="kr1"
                      placeholder="e.g., Increase NPS score from 30 to 50"
                      value={newOKR.kr1}
                      onChange={(event) => setNewOKR({ ...newOKR, kr1: event.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-xs font-semibold text-primary">
                    2
                  </span>
                  <div className="flex-1 space-y-1">
                    <Input
                      id="kr2"
                      placeholder="e.g., Reduce average response time to under 2 hours"
                      value={newOKR.kr2}
                      onChange={(event) => setNewOKR({ ...newOKR, kr2: event.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-500">
                    3
                  </span>
                  <div className="flex-1 space-y-1">
                    <Input
                      id="kr3"
                      placeholder="Optional - e.g., Achieve 95% customer retention rate"
                      value={newOKR.kr3}
                      onChange={(event) => setNewOKR({ ...newOKR, kr3: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            </SlidePanelSection>

            <SlidePanelSection label="Timeline & Tasks">
              <div className="space-y-1.5">
                <Label htmlFor="deadline" className="text-sm font-medium">
                  Target Completion Date
                  <span className="ml-1 text-xs font-normal text-muted-foreground">Optional</span>
                </Label>
                <Input
                  id="deadline"
                  type="date"
                  value={newOKR.deadline}
                  onChange={(event) => setNewOKR({ ...newOKR, deadline: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <ListChecks className="h-3.5 w-3.5" />
                  Subtasks
                  <span className="text-xs font-normal text-muted-foreground">Optional</span>
                </Label>

                {newOKR.subtasks.length > 0 && (
                  <div className="space-y-1.5">
                    {newOKR.subtasks.map((subtask, index) => (
                      <div
                        key={subtask}
                        className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-800"
                      >
                        <span className="w-5 shrink-0 text-center text-sm text-muted-foreground">
                          {index + 1}.
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">{subtask}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(index)}
                          className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-zinc-200 hover:text-foreground dark:hover:bg-zinc-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Type a subtask and press Enter..."
                    value={subtaskInput}
                    onChange={(event) => setSubtaskInput(event.target.value)}
                    onKeyDown={handleSubtaskKeyDown}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSubtask}
                    disabled={!subtaskInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </SlidePanelSection>
          </SlidePanelBody>

          <SlidePanelFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleCreateOKR();
              }}
              disabled={
                !newOKR.objective.trim() ||
                !newOKR.kr1.trim() ||
                !newOKR.kr2.trim() ||
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
