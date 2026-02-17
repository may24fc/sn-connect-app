'use client';

import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  OKRList,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@hr-portal/ui';
import { useCreateOKR, usePerformanceCycles, usePerformanceOKRs, useUpdateOKR } from '@/hooks/usePerformance';
import { usePerformanceRealtime } from '@/hooks/usePerformanceRealtime';
import { ArrowLeft, Calendar, Filter, ListChecks, Plus, Target, X } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

interface NewOKRFormState {
  objective: string;
  description: string;
  cycleId: string;
  kr1: string;
  kr2: string;
  kr3: string;
  subtasks: string[];
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

export default function OKRsPage(): ReactNode {
  usePerformanceRealtime();
  const { data: cycles = [] } = usePerformanceCycles();
  const activeCycle = cycles.find((cycle) => cycle.status === 'active') || cycles[0] || null;
  const { data: okrs = [] } = usePerformanceOKRs(activeCycle?.id);
  const createOKR = useCreateOKR();
  const updateOKR = useUpdateOKR();

  const currentOKRs = okrs;

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOKR, setNewOKR] = useState<NewOKRFormState>(emptyForm);
  const [subtaskInput, setSubtaskInput] = useState('');

  const filteredOKRs = currentOKRs.filter((okr) => {
    if (statusFilter === 'all') return true;
    return okr.status === statusFilter;
  });

  const stats = {
    total: currentOKRs.length,
    inProgress: currentOKRs.filter((o) => o.status === 'in_progress').length,
    completed: currentOKRs.filter((o) => o.status === 'completed').length,
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
        return { ...kr, currentValue: value, progressPercentage: Math.round((value / kr.targetValue) * 100) };
      }
      return kr;
    });

    const overallProgress = Math.round(
      updatedKeyResults.reduce((sum, kr) => sum + kr.progressPercentage * (kr.weight || 1), 0) /
        Math.max(updatedKeyResults.reduce((sum, kr) => sum + (kr.weight || 1), 0), 1)
    );

    updateOKR.mutate({
      id: okrId,
      keyResults: updatedKeyResults as unknown as Array<Record<string, unknown>>,
      progress: overallProgress,
    });
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

  const handleSubtaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  const handleCreateOKR = async (): Promise<void> => {
    if (!newOKR.objective.trim() || !newOKR.kr1.trim() || !newOKR.kr2.trim()) return;

    const selectedCycleId = newOKR.cycleId || activeCycle?.id;
    const hasKr3 = newOKR.kr3.trim().length > 0;

    const keyResults: Array<{
      description: string;
      targetValue: number;
      currentValue: number;
      unit: string;
      weight: number;
      progressPercentage: number;
    }> = [
      { description: newOKR.kr1, targetValue: 100, currentValue: 0, unit: '%', weight: hasKr3 ? 33 : 50, progressPercentage: 0 },
      { description: newOKR.kr2, targetValue: 100, currentValue: 0, unit: '%', weight: hasKr3 ? 33 : 50, progressPercentage: 0 },
      ...(hasKr3 ? [{ description: newOKR.kr3, targetValue: 100, currentValue: 0, unit: '%', weight: 34, progressPercentage: 0 }] : []),
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

    await createOKR.mutateAsync(payload);

    setCreateDialogOpen(false);
    setNewOKR(emptyForm);
    setSubtaskInput('');
  };

  const handleOpenCreate = (): void => {
    setNewOKR({
      ...emptyForm,
      cycleId: activeCycle?.id || '',
    });
    setSubtaskInput('');
    setCreateDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/performance">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My OKRs</h1>
            <p className="text-muted-foreground">Manage your objectives and key results</p>
          </div>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Objective
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total OKRs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Target className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20">
                <Target className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
                <p className="text-2xl font-bold">{stats.avgProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
            Clear
          </Button>
        )}
      </div>

      {/* OKR List */}
      <OKRList
        okrs={filteredOKRs}
        readonly={false}
        onUpdateKeyResult={handleUpdateKeyResult}
        emptyMessage={
          statusFilter !== 'all'
            ? 'No OKRs match the selected filter'
            : 'No OKRs created yet. Click "New Objective" to get started.'
        }
      />

      {/* Create OKR Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Create New Objective
            </DialogTitle>
            <DialogDescription>
              Define a new objective with key results for a performance cycle.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-4 py-4">
            {/* Cycle Selector */}
            <div className="space-y-2">
              <Label htmlFor="cycle">Performance Cycle</Label>
              <Select
                value={newOKR.cycleId}
                onValueChange={(value) => setNewOKR({ ...newOKR, cycleId: value })}
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

            {/* Objective */}
            <div className="space-y-2">
              <Label htmlFor="objective">Objective</Label>
              <Input
                id="objective"
                placeholder="e.g., Improve customer satisfaction rating"
                value={newOKR.objective}
                onChange={(e) => setNewOKR({ ...newOKR, objective: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Provide more context about this objective..."
                value={newOKR.description}
                onChange={(e) => setNewOKR({ ...newOKR, description: e.target.value })}
              />
            </div>

            {/* Key Result 1 */}
            <div className="space-y-2">
              <Label htmlFor="kr1">Key Result 1</Label>
              <Input
                id="kr1"
                placeholder="e.g., Increase NPS score from 30 to 50"
                value={newOKR.kr1}
                onChange={(e) => setNewOKR({ ...newOKR, kr1: e.target.value })}
              />
            </div>

            {/* Key Result 2 */}
            <div className="space-y-2">
              <Label htmlFor="kr2">Key Result 2</Label>
              <Input
                id="kr2"
                placeholder="e.g., Reduce average response time to under 2 hours"
                value={newOKR.kr2}
                onChange={(e) => setNewOKR({ ...newOKR, kr2: e.target.value })}
              />
            </div>

            {/* Key Result 3 */}
            <div className="space-y-2">
              <Label htmlFor="kr3">Key Result 3 (Optional)</Label>
              <Input
                id="kr3"
                placeholder="e.g., Achieve 95% customer retention rate"
                value={newOKR.kr3}
                onChange={(e) => setNewOKR({ ...newOKR, kr3: e.target.value })}
              />
            </div>

            {/* Personal Deadline */}
            <div className="space-y-2">
              <Label htmlFor="deadline">Personal Deadline (Optional)</Label>
              <Input
                id="deadline"
                type="date"
                value={newOKR.deadline}
                onChange={(e) => setNewOKR({ ...newOKR, deadline: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Set a personal target date for completing this objective
              </p>
            </div>

            {/* Subtasks */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" />
                Subtasks (Optional)
              </Label>

              {newOKR.subtasks.length > 0 && (
                <div className="space-y-1.5">
                  {newOKR.subtasks.map((subtask, index) => (
                    <div
                      key={`subtask-${index}`}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border"
                    >
                      <span className="text-sm text-muted-foreground w-5 shrink-0 text-center">
                        {index + 1}.
                      </span>
                      <span className="text-sm flex-1 min-w-0 truncate">{subtask}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(index)}
                        className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add a subtask..."
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleCreateOKR();
              }}
              disabled={!newOKR.objective.trim() || !newOKR.kr1.trim() || !newOKR.kr2.trim() || createOKR.isPending}
            >
              Create Objective
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
