'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import {
  useCreatePerformanceCycle,
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
  FileEdit,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';

interface CycleFormData {
  name: string;
  startDate: string;
  endDate: string;
  okrSubmissionDeadline: string;
  kpiSubmissionDeadline: string;
  selfAssessmentDeadline: string;
  managerReviewDeadline: string;
}

const emptyFormData: CycleFormData = {
  name: '',
  startDate: '',
  endDate: '',
  okrSubmissionDeadline: '',
  kpiSubmissionDeadline: '',
  selfAssessmentDeadline: '',
  managerReviewDeadline: '',
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
  const createCycle = useCreatePerformanceCycle();
  const updateCycle = useUpdatePerformanceCycle();
  const deleteCycle = useDeletePerformanceCycle();

  const [cycles, setCycles] = useState<Array<PerformanceCycle>>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<PerformanceCycle | null>(null);
  const [deletingCycle, setDeletingCycle] = useState<PerformanceCycle | null>(null);
  const [formData, setFormData] = useState<CycleFormData>(emptyFormData);
  const [savingAs, setSavingAs] = useState<'draft' | 'active' | null>(null);

  useEffect(() => {
    setCycles(cycleData);
  }, [cycleData]);

  const cycleStatusOrder: Record<string, number> = { active: 0, draft: 1, closed: 2 };

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({ initialColumn: 'startDate', initialDirection: 'desc' });

  const sortedCycles = sortItems(cycles, {
    name: (c) => c.name.toLowerCase(),
    period: (c) => c.startDate,
    okrSubmission: (c) => c.okrSubmissionDeadline ?? '',
    kpiSubmission: (c) => c.kpiSubmissionDeadline ?? '',
    selfAssessment: (c) => c.selfAssessmentDeadline ?? '',
    managerReview: (c) => c.managerReviewDeadline ?? '',
    status: (c) => cycleStatusOrder[c.status] ?? 99,
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  const handleOpenCreate = (): void => {
    setEditingCycle(null);
    setFormData(emptyFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (cycle: PerformanceCycle): void => {
    setEditingCycle(cycle);
    setFormData({
      name: cycle.name,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      okrSubmissionDeadline: cycle.okrSubmissionDeadline || '',
      kpiSubmissionDeadline: cycle.kpiSubmissionDeadline || '',
      selfAssessmentDeadline: cycle.selfAssessmentDeadline || '',
      managerReviewDeadline: cycle.managerReviewDeadline || '',
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (cycle: PerformanceCycle): void => {
    setDeletingCycle(cycle);
    setDeleteDialogOpen(true);
  };

  const handleSave = async (status: 'draft' | 'active' = 'active'): Promise<void> => {
    setSavingAs(status);
    try {
      if (editingCycle) {
        await updateCycle.mutateAsync({
          id: editingCycle.id,
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate,
          okrSubmissionDeadline: formData.okrSubmissionDeadline || null,
          kpiSubmissionDeadline: formData.kpiSubmissionDeadline || null,
          selfReviewDeadline: formData.selfAssessmentDeadline || null,
          managerReviewDeadline: formData.managerReviewDeadline || null,
        });

        addToast({
          title: 'Cycle updated',
          description: `"${formData.name}" has been updated`,
          variant: 'success',
        });
      } else {
        await createCycle.mutateAsync({
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate,
          okrSubmissionDeadline: formData.okrSubmissionDeadline || null,
          kpiSubmissionDeadline: formData.kpiSubmissionDeadline || null,
          selfReviewDeadline: formData.selfAssessmentDeadline || null,
          managerReviewDeadline: formData.managerReviewDeadline || null,
          status,
          description: null,
        });

        addToast({
          title: status === 'draft' ? 'Draft saved' : 'Cycle created',
          description: status === 'draft'
            ? `"${formData.name}" has been saved as draft`
            : `"${formData.name}" has been created and activated`,
          variant: 'success',
        });
      }

      setDialogOpen(false);
      setFormData(emptyFormData);
    } catch (error) {
      addToast({
        title: 'Error',
        description: `Failed to ${editingCycle ? 'update' : 'create'} cycle`,
        variant: 'error',
      });
    } finally {
      setSavingAs(null);
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
        addToast({
          title: 'Error',
          description: 'Failed to delete cycle',
          variant: 'error',
        });
      }
    }
    setDeleteDialogOpen(false);
    setDeletingCycle(null);
  };

  const handleActivate = async (cycle: PerformanceCycle): Promise<void> => {
    try {
      const currentActive = cycles.find((item) => item.status === 'active');

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
    return (
      formData.name.trim() !== '' &&
      formData.startDate !== '' &&
      formData.endDate !== '' &&
      new Date(formData.startDate) < new Date(formData.endDate)
    );
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
            <h1 className="text-2xl font-bold text-foreground">Review Cycles</h1>
            <p className="text-muted-foreground">Manage OKRs &amp; KPIs review cycles and deadlines</p>
          </div>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Cycle
        </Button>
      </div>

      {/* Quarterly Reference Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { quarter: 'Q1', months: 'January - March', range: 'Jan 1 - Mar 31' },
          { quarter: 'Q2', months: 'April - June', range: 'Apr 1 - Jun 30' },
          { quarter: 'Q3', months: 'July - September', range: 'Jul 1 - Sep 30' },
          { quarter: 'Q4', months: 'October - December', range: 'Oct 1 - Dec 31' },
        ].map((q) => (
          <Card key={q.quarter} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{q.quarter} 2026</p>
                  <p className="text-xs text-muted-foreground">{q.months}</p>
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
                <SortableTableHead column="managerReview" {...sortHeadProps}>Manager Review</SortableTableHead>
                <SortableTableHead column="status" {...sortHeadProps}>Status</SortableTableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.length > 0 ? (
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
                        <p className="text-sm">
                          {cycle.managerReviewDeadline
                            ? formatDate(cycle.managerReviewDeadline)
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No review cycles found. Click "New Cycle" to create one.
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
              {editingCycle ? 'Edit Cycle' : 'Create New Cycle'}
            </DialogTitle>
            <DialogDescription>
              {editingCycle
                ? 'Update the review cycle details and deadlines.'
                : 'Set up a new OKRs & KPIs review cycle with submission deadlines.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Cycle Name</Label>
              <Input
                id="name"
                placeholder="e.g., Q1 2024 Review Cycle"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

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
              <div className="space-y-2">
                <Label htmlFor="managerDeadline">Manager Review Deadline</Label>
                <Input
                  id="managerDeadline"
                  type="date"
                  value={formData.managerReviewDeadline}
                  onChange={(e) =>
                    setFormData({ ...formData, managerReviewDeadline: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            {!editingCycle && (
              <Button
                variant="outline"
                onClick={() => {
                  void handleSave('draft');
                }}
                disabled={!isFormValid() || savingAs !== null}
              >
                {savingAs === 'draft' ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FileEdit className="mr-2 h-4 w-4" />
                    Save as Draft
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={() => {
                void handleSave('active');
              }}
              disabled={!isFormValid() || savingAs !== null}
            >
              {savingAs === 'active' || (editingCycle && updateCycle.isPending) ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  {editingCycle ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                <>
                  {editingCycle ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Create Cycle
                    </>
                  )}
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
