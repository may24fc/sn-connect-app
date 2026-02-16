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
import { useCreateOKR, usePerformanceCycles, usePerformanceOKRs } from '@/hooks/usePerformance';
import { ArrowLeft, Filter, Plus, Target } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

export default function OKRsPage(): ReactNode {
  const { data: cycles = [] } = usePerformanceCycles();
  const activeCycle = cycles.find((cycle) => cycle.status === 'active') || cycles[0] || null;
  const { data: okrs = [] } = usePerformanceOKRs(activeCycle?.id);
  const createOKR = useCreateOKR();

  const currentOKRs = okrs;

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOKR, setNewOKR] = useState({
    objective: '',
    description: '',
  });

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

  const handleUpdateKeyResult = (_okrId: string, _keyResultId: string, _value: number): void => {};

  const handleCreateOKR = async (): Promise<void> => {
    if (!newOKR.objective.trim()) return;

    const payload: {
      objective: string;
      keyResults: Array<Record<string, unknown>>;
      progress: number;
      status: string;
      cycleId?: string;
    } = {
      objective: newOKR.objective,
      keyResults: [],
      progress: 0,
      status: 'in_progress',
      ...(activeCycle?.id ? { cycleId: activeCycle.id } : {}),
    };

    await createOKR.mutateAsync(payload);

    setCreateDialogOpen(false);
    setNewOKR({ objective: '', description: '' });
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
        <Button onClick={() => setCreateDialogOpen(true)}>
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Create New Objective
            </DialogTitle>
            <DialogDescription>
              Define a new objective for this performance cycle. You can add key results after
              creating the objective.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="objective">Objective</Label>
              <Input
                id="objective"
                placeholder="e.g., Improve customer satisfaction rating"
                value={newOKR.objective}
                onChange={(e) => setNewOKR({ ...newOKR, objective: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Provide more context about this objective..."
                value={newOKR.description}
                onChange={(e) => setNewOKR({ ...newOKR, description: e.target.value })}
              />
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
              disabled={!newOKR.objective.trim() || createOKR.isPending}
            >
              Create Objective
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
