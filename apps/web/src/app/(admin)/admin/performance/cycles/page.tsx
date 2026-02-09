'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  type CycleId,
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
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

// Mock data
const mockCycles: Array<PerformanceCycle> = [
  {
    id: 'cycle-2024-q1' as CycleId,
    name: 'Q1 2024 Performance Review',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    status: 'active',
    okrSubmissionDeadline: '2024-01-15',
    kpiSubmissionDeadline: '2024-01-15',
    selfAssessmentDeadline: '2024-03-25',
    managerReviewDeadline: '2024-03-31',
    createdAt: '2023-12-15',
    updatedAt: '2023-12-15',
  },
  {
    id: 'cycle-2023-q4' as CycleId,
    name: 'Q4 2023 Performance Review',
    startDate: '2023-10-01',
    endDate: '2023-12-31',
    status: 'closed',
    okrSubmissionDeadline: '2023-10-15',
    kpiSubmissionDeadline: '2023-10-15',
    selfAssessmentDeadline: '2023-12-20',
    managerReviewDeadline: '2023-12-31',
    createdAt: '2023-09-15',
    updatedAt: '2024-01-05',
  },
  {
    id: 'cycle-2024-q2' as CycleId,
    name: 'Q2 2024 Performance Review',
    startDate: '2024-04-01',
    endDate: '2024-06-30',
    status: 'draft',
    okrSubmissionDeadline: '2024-04-15',
    kpiSubmissionDeadline: '2024-04-15',
    selfAssessmentDeadline: '2024-06-25',
    managerReviewDeadline: '2024-06-30',
    createdAt: '2024-01-20',
    updatedAt: '2024-01-20',
  },
];

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
  const [cycles, setCycles] = useState<Array<PerformanceCycle>>(mockCycles);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<PerformanceCycle | null>(null);
  const [deletingCycle, setDeletingCycle] = useState<PerformanceCycle | null>(null);
  const [formData, setFormData] = useState<CycleFormData>(emptyFormData);

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

  const handleSave = (): void => {
    if (editingCycle) {
      setCycles(
        cycles.map((c) =>
          c.id === editingCycle.id
            ? {
                ...c,
                ...formData,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
    } else {
      const newCycle: PerformanceCycle = {
        id: `cycle-${Date.now()}` as CycleId,
        ...formData,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCycles([newCycle, ...cycles]);
    }
    setDialogOpen(false);
    setFormData(emptyFormData);
  };

  const handleDelete = (): void => {
    if (deletingCycle) {
      setCycles(cycles.filter((c) => c.id !== deletingCycle.id));
    }
    setDeleteDialogOpen(false);
    setDeletingCycle(null);
  };

  const handleActivate = (cycle: PerformanceCycle): void => {
    // Deactivate current active cycle
    setCycles(
      cycles.map((c) => ({
        ...c,
        status: c.id === cycle.id ? 'active' : c.status === 'active' ? 'closed' : c.status,
        updatedAt: c.id === cycle.id ? new Date().toISOString() : c.updatedAt,
      }))
    );
  };

  const handleClose = (cycle: PerformanceCycle): void => {
    setCycles(
      cycles.map((c) =>
        c.id === cycle.id ? { ...c, status: 'closed', updatedAt: new Date().toISOString() } : c
      )
    );
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
            <h1 className="text-2xl font-bold text-foreground">Performance Cycles</h1>
            <p className="text-muted-foreground">Manage performance review cycles and deadlines</p>
          </div>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Cycle
        </Button>
      </div>

      {/* Cycles Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cycle Name</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Self-Assessment</TableHead>
                <TableHead>Manager Review</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((cycle) => {
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
                            <DropdownMenuItem onClick={() => handleActivate(cycle)}>
                              <Play className="mr-2 h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          {cycle.status === 'active' && (
                            <DropdownMenuItem onClick={() => handleClose(cycle)}>
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
              })}
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
                ? 'Update the performance cycle details and deadlines.'
                : 'Set up a new performance review cycle with submission deadlines.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Cycle Name</Label>
              <Input
                id="name"
                placeholder="e.g., Q1 2024 Performance Review"
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
            <Button onClick={handleSave} disabled={!isFormValid()}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {editingCycle ? 'Save Changes' : 'Create Cycle'}
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
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
