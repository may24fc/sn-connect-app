'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  type CycleId,
  type EmployeeId,
  type EmployeePerformanceSummary,
  Input,
  Progress,
  ProgressGauge,
  ReviewStatusBadge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hr-portal/ui';
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  FileText,
  Filter,
  Search,
  Target,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

// Mock data for team members
const mockTeamMembers: Array<EmployeePerformanceSummary> = [
  {
    employeeId: 'emp-1' as EmployeeId,
    employeeName: 'John Doe',
    employeeEmail: 'john.doe@company.com',
    department: 'Engineering',
    position: 'Senior Developer',
    manager: 'You',
    managerId: 'mgr-1' as EmployeeId,
        currentCycle: {
      id: 'cycle-2024-q1' as CycleId,
      name: 'Q1 2024',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      status: 'active',
      createdAt: '2023-12-15',
      updatedAt: '2023-12-15',
    },
    okrProgress: 78,
    kpiProgress: 92,
    reviewStatus: 'pending_manager',
    overallScore: 85,
    okrCount: 3,
    kpiCount: 5,
  },
  {
    employeeId: 'emp-2' as EmployeeId,
    employeeName: 'Jane Smith',
    employeeEmail: 'jane.smith@company.com',
    department: 'Engineering',
    position: 'Developer',
    manager: 'You',
    managerId: 'mgr-1' as EmployeeId,
        currentCycle: {
      id: 'cycle-2024-q1' as CycleId,
      name: 'Q1 2024',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      status: 'active',
      createdAt: '2023-12-15',
      updatedAt: '2023-12-15',
    },
    okrProgress: 65,
    kpiProgress: 78,
    reviewStatus: 'pending_self',
        okrCount: 2,
    kpiCount: 4,
  },
  {
    employeeId: 'emp-3' as EmployeeId,
    employeeName: 'Alex Johnson',
    employeeEmail: 'alex.johnson@company.com',
    department: 'Engineering',
    position: 'Junior Developer',
    manager: 'You',
    managerId: 'mgr-1' as EmployeeId,
        currentCycle: {
      id: 'cycle-2024-q1' as CycleId,
      name: 'Q1 2024',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      status: 'active',
      createdAt: '2023-12-15',
      updatedAt: '2023-12-15',
    },
    okrProgress: 45,
    kpiProgress: 55,
    reviewStatus: 'pending_self',
        okrCount: 2,
    kpiCount: 3,
  },
  {
    employeeId: 'emp-4' as EmployeeId,
    employeeName: 'Maria Garcia',
    employeeEmail: 'maria.garcia@company.com',
    department: 'Engineering',
    position: 'QA Engineer',
    manager: 'You',
    managerId: 'mgr-1' as EmployeeId,
        currentCycle: {
      id: 'cycle-2024-q1' as CycleId,
      name: 'Q1 2024',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      status: 'active',
      createdAt: '2023-12-15',
      updatedAt: '2023-12-15',
    },
    okrProgress: 88,
    kpiProgress: 95,
    reviewStatus: 'completed',
    overallScore: 92,
    okrCount: 3,
    kpiCount: 4,
  },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getProgressColor(progress: number): string {
  if (progress >= 80) return 'bg-success';
  if (progress >= 60) return 'bg-warning';
  return 'bg-error';
}

export default function TeamPerformancePage(): ReactNode {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredMembers = mockTeamMembers.filter((member) => {
    const matchesSearch =
      member.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || member.reviewStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: mockTeamMembers.length,
    pendingReview: mockTeamMembers.filter((m) => m.reviewStatus === 'pending_manager').length,
    completed: mockTeamMembers.filter((m) => m.reviewStatus === 'completed').length,
    avgOkrProgress: Math.round(
      mockTeamMembers.reduce((sum, m) => sum + m.okrProgress, 0) / mockTeamMembers.length
    ),
    avgKpiProgress: Math.round(
      mockTeamMembers.reduce((sum, m) => sum + m.kpiProgress, 0) / mockTeamMembers.length
    ),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Performance</h1>
          <p className="text-muted-foreground">Monitor and manage your team's performance</p>
        </div>
        <Link href="/manager/reviews">
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            Pending Reviews ({stats.pendingReview})
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Team Size</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-bold">{stats.pendingReview}</p>
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
                <p className="text-sm text-muted-foreground">Avg OKR Progress</p>
                <p className="text-2xl font-bold">{stats.avgOkrProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20">
                <BarChart3 className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg KPI Score</p>
                <p className="text-2xl font-bold">{stats.avgKpiProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Team Progress Overview</CardTitle>
          <CardDescription>Average performance metrics for your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-8">
            <ProgressGauge value={stats.avgOkrProgress} label="OKR Progress" size="lg" />
            <ProgressGauge value={stats.avgKpiProgress} label="KPI Score" size="lg" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending_self">Pending Self-Assessment</SelectItem>
              <SelectItem value="pending_manager">Pending My Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Member</TableHead>
                <TableHead>OKR Progress</TableHead>
                <TableHead>KPI Score</TableHead>
                <TableHead>Review Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.employeeId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {member.avatarUrl && <AvatarImage src={member.avatarUrl} />}
                        <AvatarFallback className="text-xs">
                          {getInitials(member.employeeName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{member.position}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={member.okrProgress}
                        className="h-2 w-20"
                        indicatorClassName={getProgressColor(member.okrProgress)}
                      />
                      <span className="text-sm font-medium w-10">{member.okrProgress}%</span>
                      {member.okrProgress < 60 && (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={member.kpiProgress}
                        className="h-2 w-20"
                        indicatorClassName={getProgressColor(member.kpiProgress)}
                      />
                      <span className="text-sm font-medium w-10">{member.kpiProgress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ReviewStatusBadge status={member.reviewStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    {member.reviewStatus === 'pending_manager' ? (
                      <Link href={`/manager/reviews?employee=${member.employeeId}`}>
                        <Button size="sm">
                          Review
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm">
                        View
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-muted-foreground">No team members found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Team Insights */}
      {stats.pendingReview > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-warning">Action Required</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You have {stats.pendingReview} team member{stats.pendingReview > 1 ? 's' : ''}{' '}
                  waiting for your review. Complete these reviews before the cycle deadline.
                </p>
                <Link href="/manager/reviews" className="inline-block mt-2">
                  <Button size="sm" variant="outline">
                    Complete Reviews
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
