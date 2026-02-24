'use client';

import {
  useCreateKPI,
  usePerformanceCycles,
  usePerformanceKPIs,
  useUpdateKPI,
} from '@/hooks/usePerformance';
import { usePerformanceRealtime } from '@/hooks/usePerformanceRealtime';
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
  type KPI,
  KPIList,
  KPISummary,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@hr-portal/ui';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Minus,
  Pencil,
  Plus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

interface NewKPIFormState {
  metric: string;
  target: string;
  unit: string;
  cycleId: string;
}

const emptyKPIForm: NewKPIFormState = {
  metric: '',
  target: '',
  unit: '',
  cycleId: '',
};

function getWeightedScore(kpis: Array<KPI>): number {
  const totalWeight = kpis.reduce((sum, kpi) => sum + (kpi.weight || 0), 0);
  if (totalWeight === 0) return 0;

  const weightedSum = kpis.reduce((sum, kpi) => {
    return sum + kpi.score * (kpi.weight || 0);
  }, 0);

  return Math.round(weightedSum / totalWeight);
}

export default function KPIsPage(): ReactNode {
  usePerformanceRealtime();
  const { addToast } = useToast();
  const { data: cycles = [] } = usePerformanceCycles();
  const activeCycle = cycles.find((cycle) => cycle.status === 'active') || cycles[0] || null;
  const { data: kpis = [] } = usePerformanceKPIs(activeCycle?.id);
  const createKPI = useCreateKPI();
  const updateKPI = useUpdateKPI();

  const currentKPIs = kpis;

  const weightedScore = getWeightedScore(currentKPIs);
  const onTargetCount = currentKPIs.filter((kpi) => kpi.score >= 100).length;
  const nearTargetCount = currentKPIs.filter((kpi) => kpi.score >= 80 && kpi.score < 100).length;
  const belowTargetCount = currentKPIs.filter((kpi) => kpi.score < 80).length;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKPI, setNewKPI] = useState<NewKPIFormState>(emptyKPIForm);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<KPI | null>(null);
  const [updatedValue, setUpdatedValue] = useState('');

  const selectedCycle = cycles.find((c) => c.id === newKPI.cycleId) || activeCycle;

  const handleOpenCreate = (): void => {
    setNewKPI({
      ...emptyKPIForm,
      cycleId: activeCycle?.id || '',
    });
    setCreateDialogOpen(true);
  };

  const handleCreateKPI = async (): Promise<void> => {
    if (!newKPI.metric.trim() || !newKPI.target.trim()) return;

    const today = new Date().toISOString().slice(0, 10);
    const periodStart = selectedCycle?.startDate ?? today;
    const periodEnd = selectedCycle?.endDate ?? today;

    try {
      await createKPI.mutateAsync({
        name: newKPI.metric,
        targetValue: Number(newKPI.target),
        currentValue: 0,
        ...(newKPI.unit ? { unit: newKPI.unit } : {}),
        ...(newKPI.cycleId ? { cycleId: newKPI.cycleId } : {}),
        periodStart,
        periodEnd,
      });

      addToast({
        title: 'KPI created',
        description: 'Your metric has been successfully created',
        variant: 'success',
      });

      setCreateDialogOpen(false);
      setNewKPI(emptyKPIForm);
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to create KPI',
        variant: 'error',
      });
    }
  };

  const handleOpenUpdateDialog = (kpi: KPI): void => {
    setSelectedKPI(kpi);
    setUpdatedValue(String(kpi.actual));
    setUpdateDialogOpen(true);
  };

  const handleUpdateKPI = async (): Promise<void> => {
    if (!selectedKPI || !updatedValue) return;
    try {
      await updateKPI.mutateAsync({
        id: selectedKPI.id,
        currentValue: Number(updatedValue),
      });

      addToast({
        title: 'KPI updated',
        description: `Progress for "${selectedKPI.name}" has been updated`,
        variant: 'success',
      });

      setUpdateDialogOpen(false);
      setSelectedKPI(null);
      setUpdatedValue('');
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to update KPI',
        variant: 'error',
      });
    }
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
            <h1 className="text-2xl font-bold text-foreground">My KPIs</h1>
            <p className="text-muted-foreground">Track your key performance indicators</p>
          </div>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New KPI
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weighted Score</p>
                <p className="text-2xl font-bold">{weightedScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On Target</p>
                <p className="text-2xl font-bold">{onTargetCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Minus className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Near Target</p>
                <p className="text-2xl font-bold">{nearTargetCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error/10">
                <TrendingDown className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Below Target</p>
                <p className="text-2xl font-bold">{belowTargetCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Summary Bar */}
      <KPISummary kpis={currentKPIs} />

      {/* KPI List */}
      <KPIList kpis={currentKPIs} />

      {/* Update Progress Section */}
      {currentKPIs.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Update Progress</h3>
            <div className="space-y-2">
              {currentKPIs.map((kpi) => (
                <div
                  key={kpi.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 dark:border-zinc-800 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{kpi.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {kpi.actual} / {kpi.target} {kpi.unit}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleOpenUpdateDialog(kpi)}>
                    <Pencil className="mr-1.5 h-3 w-3" />
                    Update
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update KPI Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Update KPI Progress
            </DialogTitle>
            <DialogDescription>Update the current value for this KPI.</DialogDescription>
          </DialogHeader>

          {selectedKPI && (
            <div className="space-y-4 py-4">
              <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
                <p className="text-sm font-medium">{selectedKPI.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Target: {selectedKPI.target} {selectedKPI.unit} | Current: {selectedKPI.actual}{' '}
                  {selectedKPI.unit}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kpi-update-value">New Current Value</Label>
                <Input
                  id="kpi-update-value"
                  type="number"
                  placeholder="Enter new value"
                  value={updatedValue}
                  onChange={(e) => setUpdatedValue(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleUpdateKPI();
              }}
              disabled={!updatedValue || updateKPI.isPending}
            >
              Save Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Performance Insight */}
      {weightedScore < 80 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <TrendingDown className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-warning">Performance Alert</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your weighted KPI score is below the target threshold. Focus on improving the
                  underperforming areas, especially Documentation Coverage which has the lowest
                  score.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {weightedScore >= 100 && (
        <Card className="border-success/50 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-success">Excellent Performance!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your weighted KPI score exceeds the target. Keep up the great work! Consider
                  sharing your strategies with the team.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create KPI Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Create New KPI
            </DialogTitle>
            <DialogDescription>
              Define a new key performance indicator to track your progress.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-4 py-4">
            {/* Performance Cycle */}
            <div className="space-y-2">
              <Label htmlFor="kpi-cycle">Performance Cycle</Label>
              <Select
                value={newKPI.cycleId}
                onValueChange={(value) => setNewKPI({ ...newKPI, cycleId: value })}
              >
                <SelectTrigger id="kpi-cycle">
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

            {/* Metric */}
            <div className="space-y-2">
              <Label htmlFor="kpi-metric">Metric</Label>
              <Input
                id="kpi-metric"
                placeholder="e.g., Customer Satisfaction Score"
                value={newKPI.metric}
                onChange={(e) => setNewKPI({ ...newKPI, metric: e.target.value })}
              />
            </div>

            {/* Target */}
            <div className="space-y-2">
              <Label htmlFor="kpi-target">Target</Label>
              <Input
                id="kpi-target"
                type="number"
                placeholder="e.g., 95"
                value={newKPI.target}
                onChange={(e) => setNewKPI({ ...newKPI, target: e.target.value })}
              />
            </div>

            {/* Unit */}
            <div className="space-y-2">
              <Label htmlFor="kpi-unit">Unit (Optional)</Label>
              <Input
                id="kpi-unit"
                placeholder="e.g., %, count, hours"
                value={newKPI.unit}
                onChange={(e) => setNewKPI({ ...newKPI, unit: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleCreateKPI();
              }}
              disabled={!newKPI.metric.trim() || !newKPI.target.trim() || createKPI.isPending}
            >
              Create KPI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
