'use client';

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CompletionTrendChart,
  type CompletionTrendData,
  CycleProgressCards,
  DepartmentPerformanceChart,
  type DepartmentPerformanceData,
  type EmployeeId,
  Input,
  type PerformanceDashboardStats,
  PerformanceSummaryCards,
  Progress,
  RatingDistributionChart,
  type RatingDistributionData,
  type ReviewStatus,
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
import { usePerformanceCycles, usePerformanceKPIs, usePerformanceOKRs } from '@/hooks/usePerformance';
import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, Search, Settings } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

// Mock data
const mockStats: PerformanceDashboardStats = {
  totalEmployees: 150,
  okrsCompleted: 45,
  okrsInProgress: 85,
  kpisOnTarget: 98,
  kpisBelowTarget: 32,
  reviewsPendingSelf: 25,
  reviewsPendingManager: 18,
  reviewsCompleted: 107,
  averageOkrProgress: 72,
  averageKpiScore: 85,
};

const mockTrendData: Array<CompletionTrendData> = [
  { month: 'Oct', okrsCompleted: 20, kpisCompleted: 80, reviewsCompleted: 15 },
  { month: 'Nov', okrsCompleted: 35, kpisCompleted: 85, reviewsCompleted: 45 },
  { month: 'Dec', okrsCompleted: 40, kpisCompleted: 90, reviewsCompleted: 75 },
  { month: 'Jan', okrsCompleted: 45, kpisCompleted: 95, reviewsCompleted: 107 },
];

const mockDepartmentData: Array<DepartmentPerformanceData> = [
  { department: 'Engineering', averageOkrProgress: 78, averageKpiScore: 88, employeeCount: 45 },
  { department: 'Marketing', averageOkrProgress: 65, averageKpiScore: 75, employeeCount: 20 },
  { department: 'Sales', averageOkrProgress: 82, averageKpiScore: 92, employeeCount: 35 },
  { department: 'HR', averageOkrProgress: 70, averageKpiScore: 85, employeeCount: 15 },
  { department: 'Finance', averageOkrProgress: 75, averageKpiScore: 90, employeeCount: 12 },
];

const mockRatingData: Array<RatingDistributionData> = [
  { rating: 'exceptional', count: 15, percentage: 14 },
  { rating: 'exceeds', count: 35, percentage: 33 },
  { rating: 'meets', count: 42, percentage: 39 },
  { rating: 'needs_improvement', count: 12, percentage: 11 },
  { rating: 'unsatisfactory', count: 3, percentage: 3 },
];

interface EmployeeReviewSummary {
  id: EmployeeId;
  name: string;
  email: string;
  department: string;
  manager: string;
  okrProgress: number;
  kpiScore: number;
  reviewStatus: ReviewStatus;
}

const mockEmployees: Array<EmployeeReviewSummary> = [
  {
    id: 'emp-1' as EmployeeId,
    name: 'John Doe',
    email: 'john.doe@company.com',
    department: 'Engineering',
    manager: 'Sarah Johnson',
    okrProgress: 85,
    kpiScore: 92,
    reviewStatus: 'completed',
  },
  {
    id: 'emp-2' as EmployeeId,
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    department: 'Marketing',
    manager: 'Mike Brown',
    okrProgress: 65,
    kpiScore: 78,
    reviewStatus: 'pending_manager',
  },
  {
    id: 'emp-3' as EmployeeId,
    name: 'Alex Johnson',
    email: 'alex.johnson@company.com',
    department: 'Sales',
    manager: 'Emily Davis',
    okrProgress: 45,
    kpiScore: 55,
    reviewStatus: 'pending_self',
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

export default function AdminPerformancePage(): ReactNode {
  const { data: cycles = [] } = usePerformanceCycles();
  const activeCycle = cycles.find((cycle) => cycle.status === 'active') || cycles[0] || null;
  const { data: okrs = [] } = usePerformanceOKRs(activeCycle?.id);
  const { data: kpis = [] } = usePerformanceKPIs(activeCycle?.id);

  const { data: reviewsPayload } = useQuery({
    queryKey: [...queryKeys.performance.reviews(), activeCycle?.id || 'all', 'admin-dashboard'],
    queryFn: async (): Promise<{ data: Array<any> }> => {
      const params = new URLSearchParams();
      if (activeCycle?.id) params.set('cycleId', activeCycle.id);
      const response = await fetch(`/api/performance/reviews?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    },
  });

  const reviewRows = reviewsPayload?.data || [];

  const liveEmployees: Array<EmployeeReviewSummary> = reviewRows.map((review: any) => {
    const employee = review.employees || {};
    const employeeOkrs = okrs.filter((okr) => okr.employeeId === review.employee_id);
    const employeeKpis = kpis.filter((kpi) => kpi.employeeId === review.employee_id);

    const okrProgress =
      employeeOkrs.length > 0
        ? Math.round(
            employeeOkrs.reduce((sum, okr) => sum + okr.progressPercentage, 0) / employeeOkrs.length
          )
        : 0;

    const kpiScore =
      employeeKpis.length > 0
        ? Math.round(employeeKpis.reduce((sum, kpi) => sum + kpi.score, 0) / employeeKpis.length)
        : 0;

    const reviewStatus: ReviewStatus =
      review.status === 'pending'
        ? 'pending_self'
        : review.status === 'self_review'
          ? 'pending_manager'
          : review.status === 'manager_review'
            ? 'pending_hr'
            : 'completed';

    return {
      id: review.employee_id as EmployeeId,
      name: `${employee.first_name || 'Employee'} ${employee.last_name || ''}`.trim(),
      email: employee.company_email || employee.personal_email || 'n/a',
      department: employee.department || 'Unassigned',
      manager: 'N/A',
      okrProgress,
      kpiScore,
      reviewStatus,
    };
  });

  const uniqueEmployees = Array.from(
    new Map(liveEmployees.map((employee) => [employee.id, employee])).values()
  );

  const employeesData = uniqueEmployees.length > 0 ? uniqueEmployees : mockEmployees;

  const liveStats: PerformanceDashboardStats = {
    totalEmployees: employeesData.length,
    okrsCompleted: okrs.filter((okr) => okr.status === 'completed').length,
    okrsInProgress: okrs.filter((okr) => okr.status !== 'completed').length,
    kpisOnTarget: kpis.filter((kpi) => kpi.score >= 100).length,
    kpisBelowTarget: kpis.filter((kpi) => kpi.score < 80).length,
    reviewsPendingSelf: employeesData.filter((employee) => employee.reviewStatus === 'pending_self')
      .length,
    reviewsPendingManager: employeesData.filter(
      (employee) => employee.reviewStatus === 'pending_manager' || employee.reviewStatus === 'pending_hr'
    ).length,
    reviewsCompleted: employeesData.filter((employee) => employee.reviewStatus === 'completed')
      .length,
    averageOkrProgress:
      okrs.length > 0
        ? Math.round(okrs.reduce((sum, okr) => sum + okr.progressPercentage, 0) / okrs.length)
        : 0,
    averageKpiScore:
      kpis.length > 0 ? Math.round(kpis.reduce((sum, kpi) => sum + kpi.score, 0) / kpis.length) : 0,
  };

  const stats = employeesData.length > 0 ? liveStats : mockStats;

  const liveDepartmentData: Array<DepartmentPerformanceData> = Object.values(
    employeesData.reduce(
      (accumulator, employee) => {
        const key = employee.department;
        if (!accumulator[key]) {
          accumulator[key] = {
            department: key,
            averageOkrProgress: 0,
            averageKpiScore: 0,
            employeeCount: 0,
            okrSum: 0,
            kpiSum: 0,
          };
        }

        accumulator[key].employeeCount += 1;
        accumulator[key].okrSum += employee.okrProgress;
        accumulator[key].kpiSum += employee.kpiScore;
        accumulator[key].averageOkrProgress = Math.round(
          accumulator[key].okrSum / accumulator[key].employeeCount
        );
        accumulator[key].averageKpiScore = Math.round(
          accumulator[key].kpiSum / accumulator[key].employeeCount
        );

        return accumulator;
      },
      {} as Record<
        string,
        DepartmentPerformanceData & { okrSum: number; kpiSum: number }
      >
    )
  ).map(({ okrSum: _okrSum, kpiSum: _kpiSum, ...value }) => value);

  const departmentData = liveDepartmentData.length > 0 ? liveDepartmentData : mockDepartmentData;

  const statusToRating = (status: ReviewStatus): RatingDistributionData['rating'] => {
    if (status === 'completed') return 'meets';
    if (status === 'pending_hr') return 'needs_improvement';
    if (status === 'pending_manager') return 'meets';
    return 'needs_improvement';
  };

  const liveRatingData: Array<RatingDistributionData> = ['exceptional', 'exceeds', 'meets', 'needs_improvement', 'unsatisfactory'].map(
    (rating) => {
      const count = employeesData.filter((employee) => statusToRating(employee.reviewStatus) === rating)
        .length;
      const percentage = employeesData.length > 0 ? Math.round((count / employeesData.length) * 100) : 0;
      return { rating: rating as RatingDistributionData['rating'], count, percentage };
    }
  );

  const ratingData =
    liveRatingData.reduce((sum, item) => sum + item.count, 0) > 0 ? liveRatingData : mockRatingData;

  const currentCycleLabel = activeCycle?.name || 'Performance Cycle';
  const currentCycleRange =
    activeCycle && `${activeCycle.startDate} - ${activeCycle.endDate}`;

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const departments = [...new Set(employeesData.map((e) => e.department))];

  const filteredEmployees = employeesData.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || emp.reviewStatus === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance Dashboard</h1>
          <p className="text-muted-foreground">Organization-wide performance metrics and reviews</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/performance/cycles">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Manage Cycles
            </Button>
          </Link>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
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
                <h2 className="font-semibold">{currentCycleLabel}</h2>
                <p className="text-sm text-muted-foreground">{currentCycleRange || 'No cycle dates'}</p>
              </div>
            </div>
            <Badge variant="success">Active Cycle</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <PerformanceSummaryCards stats={stats} />

      {/* Cycle Progress */}
      <CycleProgressCards
        selfAssessmentComplete={stats.reviewsCompleted}
        selfAssessmentTotal={Math.max(stats.totalEmployees, 1)}
        managerReviewComplete={stats.reviewsCompleted - stats.reviewsPendingManager}
        managerReviewTotal={Math.max(stats.totalEmployees - stats.reviewsPendingSelf, 1)}
        hrReviewComplete={stats.reviewsCompleted}
        hrReviewTotal={Math.max(stats.totalEmployees, 1)}
      />

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CompletionTrendChart data={mockTrendData} />
        <DepartmentPerformanceChart data={departmentData} />
      </div>

      <RatingDistributionChart data={ratingData} />

      {/* Employee List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Employee Reviews</CardTitle>
              <CardDescription>Monitor review progress across the organization</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_self">Pending Self</SelectItem>
                <SelectItem value="pending_manager">Pending Manager</SelectItem>
                <SelectItem value="pending_hr">Pending HR</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>OKR Progress</TableHead>
                <TableHead>KPI Score</TableHead>
                <TableHead>Review Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getInitials(emp.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{emp.department}</TableCell>
                  <TableCell>{emp.manager}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={emp.okrProgress} className="h-2 w-16" />
                      <span className="text-sm">{emp.okrProgress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={emp.kpiScore}
                        className="h-2 w-16"
                        indicatorClassName={
                          emp.kpiScore >= 80
                            ? 'bg-success'
                            : emp.kpiScore >= 60
                              ? 'bg-warning'
                              : 'bg-error'
                        }
                      />
                      <span className="text-sm">{emp.kpiScore}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ReviewStatusBadge status={emp.reviewStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
