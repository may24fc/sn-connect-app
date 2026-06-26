'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import {
  useDeletePerformanceCycle,
  usePerformanceCycles,
  useUpdatePerformanceCycle,
} from '@/hooks/usePerformance';
import { useTableSort } from '@/hooks/useTableSort';
import {
  Badge,
  Button,
  Card,
  CardContent,
  type CycleStatus,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  type PerformanceCycle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@hr-portal/ui';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  MoreVertical,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

interface CycleFormData {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  okrSubmissionDeadline: string;
  kpiSubmissionDeadline: string;
  selfAssessmentDeadline: string;
}

function getQuarterFromMonth(month: number): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  if (month <= 2) return 'Q1';
  if (month <= 5) return 'Q2';
  if (month <= 8) return 'Q3';
  return 'Q4';
}

function createDefaultFormData(): CycleFormData {
  const now = new Date();
  return {
    quarter: getQuarterFromMonth(now.getMonth()),
    year: now.getFullYear(),
    okrSubmissionDeadline: '',
    kpiSubmissionDeadline: '',
    selfAssessmentDeadline: '',
  };
}

function getQuarterDateRange(
  year: number,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
): { startDate: string; endDate: string } {
  const quarterStartMonthMap: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number> = {
    Q1: 0,
    Q2: 3,
    Q3: 6,
    Q4: 9,
  };

  const startMonth = quarterStartMonthMap[quarter];
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0));

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function getQuarterFromDate(dateString: string): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return getQuarterFromMonth(date.getUTCMonth());
}

const quarterLabels: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', string> = {
  Q1: 'January - March',
  Q2: 'April - June',
  Q3: 'July - September',
  Q4: 'October - December',
};

const statusConfig: Record<
  CycleStatus,
  { label: string; variant: 'success' | 'warning' | 'secondary'; icon: typeof CheckCircle2 }
> = {
  active: { label: 'Active', variant: 'success', icon: Play },
  draft: { label: 'Draft', variant: 'secondary', icon: Clock },
  closed: { label: 'Closed', variant: 'warning', icon: Pause },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CyclesPage(): ReactNode {
  const { addToast } = useToast();
  const { data: cycleData = [] } = usePerformanceCycles();
  const updateCycle = useUpdatePerformanceCycle();
  const deleteCycle = useDeletePerformanceCycle();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<PerformanceCycle | null>(null);
  const [deletingCycle, setDeletingCycle] = useState<PerformanceCycle | null>(null);
  const [formData, setFormData] = useState<CycleFormData>(createDefaultFormData);
  const [saving, setSaving] = useState(false);

  const cycleStatusOrder: Record<string, number> = { active: 0, draft: 1, closed: 2 };

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({ initialColumn: 'startDate', initialDirection: 'desc' });

  const sortedCycles = sortItems(cycleData, {
    name: (c) => c.name.toLowerCase(),
    period: (c) => c.startDate,
    okrSubmission: (c) => c.okrSubmissionDeadline ?? '',
    kpiSubmission: (c) => c.kpiSubmissionDeadline ?? '',
    selfAssessment: (c) => c.selfAssessmentDeadline ?? '',
    status: (c) => cycleStatusOrder[c.status] ?? 99,
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  const handleOpenEdit = (cycle: PerformanceCycle): void => {
    setEditingCycle(cycle);
    setFormData({
      quarter: getQuarterFromDate(cycle.startDate),
      year: new Date(`${cycle.startDate}T00:00:00.000Z`).getUTCFullYear(),
      okrSubmissionDeadline: cycle.okrSubmissionDeadline || '',
      kpiSubmissionDeadline: cycle.kpiSubmissionDeadline || '',
      selfAssessmentDeadline: cycle.selfAssessmentDeadline || '',
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (cycle: PerformanceCycle): void => {
    setDeletingCycle(cycle);
    setDeleteDialogOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!editingCycle) {
      return;
    }

    setSaving(true);
    try {
      await updateCycle.mutateAsync({
        id: editingCycle.id,
        quarter: formData.quarter,
        year: formData.year,
        okrSubmissionDeadline: formData.okrSubmissionDeadline || null,
        kpiSubmissionDeadline: formData.kpiSubmissionDeadline || null,
        selfReviewDeadline: formData.selfAssessmentDeadline || null,
      });

      addToast({
        title: 'Cycle updated',
        description: `"${formData.quarter} ${formData.year}" has been updated`,
        variant: 'success',
      });

      setDialogOpen(false);
      setFormData(createDefaultFormData());
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to update cycle',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (deletingCycle) {
      try {
        await deleteCycle.mutateAsync(deletingCycle.id);

        addToast({
          title: 'Cycle deleted',
          description: `"${deletingCycle.name}" has been deleted`,
          variant: 'success',
        });
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : 'Failed to delete cycle';

        addToast({
          title: 'Error',
          description: message,
          variant: 'error',
        });
      }
    }
    setDeleteDialogOpen(false);
    setDeletingCycle(null);
  };

  const handleActivate = async (cycle: PerformanceCycle): Promise<void> => {
    try {
      const currentActive = cycleData.find((item) => item.status === 'active');

      if (currentActive && currentActive.id !== cycle.id) {
        await updateCycle.mutateAsync({
          id: currentActive.id,
          status: 'completed',
        });
      }

      await updateCycle.mutateAsync({ id: cycle.id, status: 'active' });

      addToast({
        title: 'Cycle activated',
        description: `"${cycle.name}" is now active`,
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to activate cycle',
        variant: 'error',
      });
    }
  };

  const handleClose = async (cycle: PerformanceCycle): Promise<void> => {
    try {
      await updateCycle.mutateAsync({ id: cycle.id, status: 'completed' });

      addToast({
        title: 'Cycle closed',
        description: `"${cycle.name}" has been marked as completed`,
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to close cycle',
        variant: 'error',
      });
    }
  };

  const isFormValid = (): boolean => {
    return Number.isInteger(formData.year) && formData.year >= 2000 && formData.year <= 2100;
  };

  const selectedBounds = getQuarterDateRange(formData.year, formData.quarter);

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
            <h1 className="text-2xl font-bold text-foreground">Review Cycles</h1>
            <p className="text-muted-foreground">Manage calendar-quarter review cycles and deadlines</p>
          </div>
        </div>
      </div>

      {/* Quarterly Reference Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((quarter) => (
          <Card key={quarter} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{quarter} {new Date().getFullYear()}</p>
                  <p className="text-xs text-muted-foreground">{quarterLabels[quarter]}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cycles Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead column="name" {...sortHeadProps}>Cycle Name</SortableTableHead>
                <SortableTableHead column="period" {...sortHeadProps}>Period</SortableTableHead>
                <SortableTableHead column="okrSubmission" {...sortHeadProps}>OKR Due</SortableTableHead>
                <SortableTableHead column="kpiSubmission" {...sortHeadProps}>KPI Due</SortableTableHead>
                <SortableTableHead column="selfAssessment" {...sortHeadProps}>Self-Assessment</SortableTableHead>
                <SortableTableHead column="status" {...sortHeadProps}>Status</SortableTableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycleData.length > 0 ? (
                sortedCycles.map((cycle) => {
                  const config = statusConfig[cycle.status];
                  const StatusIcon = config.icon;
                  return (
                    <TableRow key={cycle.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{cycle.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Created {formatDate(cycle.createdAt)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {cycle.okrSubmissionDeadline
                            ? formatDate(cycle.okrSubmissionDeadline)
                            : '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {cycle.kpiSubmissionDeadline
                            ? formatDate(cycle.kpiSubmissionDeadline)
                            : '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {cycle.selfAssessmentDeadline
                            ? formatDate(cycle.selfAssessmentDeadline)
                            : '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(cycle)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {cycle.status === 'draft' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  void handleActivate(cycle);
                                }}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            {cycle.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  void handleClose(cycle);
                                }}
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                Close Cycle
                              </DropdownMenuItem>
                            )}
                            {cycle.status !== 'active' && (
                              <DropdownMenuItem
                                onClick={() => handleOpenDelete(cycle)}
                                className="text-error"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No review cycles found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Edit Cycle
            </DialogTitle>
            <DialogDescription>
              Update the quarter assignment and submission deadlines.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                  <Label htmlFor="quarter">Quarter</Label>
                  <select
                    id="quarter"
                    value={formData.quarter}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quarter: e.target.value as 'Q1' | 'Q2' | 'Q3' | 'Q4',
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Q1">Q1 (Jan-Mar)</option>
                    <option value="Q2">Q2 (Apr-Jun)</option>
                    <option value="Q3">Q3 (Jul-Sep)</option>
                    <option value="Q4">Q4 (Oct-Dec)</option>
                  </select>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                <Input
                    id="year"
                    type="number"
                    min={2000}
                    max={2100}
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        year: Number.parseInt(e.target.value || '0', 10),
                      })
                    }
                />
              </div>
            </div>

              <Card className="border-dashed">
                <CardContent className="p-4 space-y-1">
                  <p className="text-sm font-semibold">{formData.quarter} {formData.year}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(selectedBounds.startDate)} - {formatDate(selectedBounds.endDate)}
                  </p>
                </CardContent>
              </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="okrDeadline">OKR Submission Deadline</Label>
                <Input
                  id="okrDeadline"
                  type="date"
                  value={formData.okrSubmissionDeadline}
                  onChange={(e) =>
                    setFormData({ ...formData, okrSubmissionDeadline: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kpiDeadline">KPI Submission Deadline</Label>
                <Input
                  id="kpiDeadline"
                  type="date"
                  value={formData.kpiSubmissionDeadline}
                  onChange={(e) =>
                    setFormData({ ...formData, kpiSubmissionDeadline: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="selfDeadline">Self-Assessment Deadline</Label>
                <Input
                  id="selfDeadline"
                  type="date"
                  value={formData.selfAssessmentDeadline}
                  onChange={(e) =>
                    setFormData({ ...formData, selfAssessmentDeadline: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleSave();
              }}
              disabled={!isFormValid() || saving}
            >
              {saving || updateCycle.isPending ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-error">
              <Trash2 className="h-5 w-5" />
              Delete Cycle
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingCycle?.name}"? This action cannot be undone
              and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void handleDelete();
              }}
              disabled={deleteCycle.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
