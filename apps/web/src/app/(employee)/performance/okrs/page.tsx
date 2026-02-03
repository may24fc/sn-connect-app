'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Filter,
  Target,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Textarea,
  Label,
  OKRList,
  type OKR,
  type OKRStatus,
} from '@hr-portal/ui';

// Mock data
const mockOKRs: OKR[] = [
  {
    id: 'okr-1' as OKR['id'],
    employeeId: 'emp-1' as OKR['employeeId'],
    cycleId: 'cycle-2024-q1' as OKR['cycleId'],
    objective: 'Improve customer satisfaction rating',
    description: 'Increase NPS score through better service delivery and faster response times',
    status: 'in_progress',
    progressPercentage: 75,
    keyResults: [
      {
        id: 'kr-1' as OKR['keyResults'][0]['id'],
        okrId: 'okr-1' as OKR['keyResults'][0]['okrId'],
        description: 'Achieve NPS score of 45+',
        targetValue: 45,
        currentValue: 38,
        unit: 'points',
        weight: 40,
        progressPercentage: 84,
        createdAt: '2024-01-01',
        updatedAt: '2024-02-15',
      },
      {
        id: 'kr-2' as OKR['keyResults'][0]['id'],
        okrId: 'okr-1' as OKR['keyResults'][0]['okrId'],
        description: 'Reduce average response time to under 2 hours',
        targetValue: 2,
        currentValue: 2.5,
        unit: 'hours',
        weight: 30,
        progressPercentage: 60,
        createdAt: '2024-01-01',
        updatedAt: '2024-02-15',
      },
      {
        id: 'kr-3' as OKR['keyResults'][0]['id'],
        okrId: 'okr-1' as OKR['keyResults'][0]['okrId'],
        description: 'Resolve 95% of tickets on first contact',
        targetValue: 95,
        currentValue: 88,
        unit: '%',
        weight: 30,
        progressPercentage: 93,
        createdAt: '2024-01-01',
        updatedAt: '2024-02-15',
      },
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-02-15',
  },
  {
    id: 'okr-2' as OKR['id'],
    employeeId: 'emp-1' as OKR['employeeId'],
    cycleId: 'cycle-2024-q1' as OKR['cycleId'],
    objective: 'Complete professional development goals',
    description: 'Enhance skills through certifications and training programs',
    status: 'in_progress',
    progressPercentage: 50,
    keyResults: [
      {
        id: 'kr-4' as OKR['keyResults'][0]['id'],
        okrId: 'okr-2' as OKR['keyResults'][0]['okrId'],
        description: 'Complete 3 certification courses',
        targetValue: 3,
        currentValue: 1,
        unit: 'courses',
        weight: 50,
        progressPercentage: 33,
        createdAt: '2024-01-01',
        updatedAt: '2024-02-15',
      },
      {
        id: 'kr-5' as OKR['keyResults'][0]['id'],
        okrId: 'okr-2' as OKR['keyResults'][0]['okrId'],
        description: 'Attend 5 industry webinars',
        targetValue: 5,
        currentValue: 4,
        unit: 'webinars',
        weight: 25,
        progressPercentage: 80,
        createdAt: '2024-01-01',
        updatedAt: '2024-02-15',
      },
      {
        id: 'kr-6' as OKR['keyResults'][0]['id'],
        okrId: 'okr-2' as OKR['keyResults'][0]['okrId'],
        description: 'Present learnings to team',
        targetValue: 2,
        currentValue: 1,
        unit: 'presentations',
        weight: 25,
        progressPercentage: 50,
        createdAt: '2024-01-01',
        updatedAt: '2024-02-15',
      },
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-02-15',
  },
  {
    id: 'okr-3' as OKR['id'],
    employeeId: 'emp-1' as OKR['employeeId'],
    cycleId: 'cycle-2024-q1' as OKR['cycleId'],
    objective: 'Streamline internal documentation',
    status: 'completed',
    progressPercentage: 100,
    keyResults: [
      {
        id: 'kr-7' as OKR['keyResults'][0]['id'],
        okrId: 'okr-3' as OKR['keyResults'][0]['okrId'],
        description: 'Document 10 core processes',
        targetValue: 10,
        currentValue: 10,
        unit: 'processes',
        weight: 60,
        progressPercentage: 100,
        createdAt: '2024-01-01',
        updatedAt: '2024-02-15',
      },
      {
        id: 'kr-8' as OKR['keyResults'][0]['id'],
        okrId: 'okr-3' as OKR['keyResults'][0]['okrId'],
        description: 'Create video tutorials for top 5 FAQs',
        targetValue: 5,
        currentValue: 5,
        unit: 'videos',
        weight: 40,
        progressPercentage: 100,
        createdAt: '2024-01-01',
        updatedAt: '2024-02-15',
      },
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-02-15',
  },
];

export default function OKRsPage(): ReactNode {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOKR, setNewOKR] = useState({
    objective: '',
    description: '',
  });

  const filteredOKRs = mockOKRs.filter((okr) => {
    if (statusFilter === 'all') return true;
    return okr.status === statusFilter;
  });

  const stats = {
    total: mockOKRs.length,
    inProgress: mockOKRs.filter((o) => o.status === 'in_progress').length,
    completed: mockOKRs.filter((o) => o.status === 'completed').length,
    avgProgress: Math.round(
      mockOKRs.reduce((sum, o) => sum + o.progressPercentage, 0) / mockOKRs.length
    ),
  };

  const handleUpdateKeyResult = (okrId: string, keyResultId: string, value: number): void => {
    // TODO: Implement API call to update key result
    console.log('Update key result:', { okrId, keyResultId, value });
  };

  const handleCreateOKR = (): void => {
    // TODO: Implement API call to create OKR
    console.log('Create OKR:', newOKR);
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
            <p className="text-muted-foreground">
              Manage your objectives and key results
            </p>
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
              Define a new objective for this performance cycle. You can add key results after creating the objective.
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
              onClick={handleCreateOKR}
              disabled={!newOKR.objective.trim()}
            >
              Create Objective
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
