'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import {
  Target,
  BarChart3,
  FileText,
  Calendar,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Progress,
  ReviewStatusBadge,
  ProgressGauge,
  type OKR,
  type KPI,
  type PerformanceCycle,
  type ReviewStatus,
} from '@hr-portal/ui';

// Mock data - replace with actual API calls
const mockCycle: PerformanceCycle = {
  id: 'cycle-2024-q1' as PerformanceCycle['id'],
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
};

const mockOKRs: OKR[] = [
  {
    id: 'okr-1' as OKR['id'],
    employeeId: 'emp-1' as OKR['employeeId'],
    cycleId: 'cycle-2024-q1' as OKR['cycleId'],
    objective: 'Improve customer satisfaction rating',
    description: 'Increase NPS score through better service delivery',
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
        description: 'Reduce response time to under 2 hours',
        targetValue: 2,
        currentValue: 2.5,
        unit: 'hours',
        weight: 30,
        progressPercentage: 60,
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
    status: 'in_progress',
    progressPercentage: 50,
    keyResults: [
      {
        id: 'kr-3' as OKR['keyResults'][0]['id'],
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
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-02-15',
  },
];

const mockKPIs: KPI[] = [
  {
    id: 'kpi-1' as KPI['id'],
    employeeId: 'emp-1' as KPI['employeeId'],
    cycleId: 'cycle-2024-q1' as KPI['cycleId'],
    name: 'Project Delivery Rate',
    description: 'Percentage of projects delivered on time',
    target: 90,
    actual: 85,
    unit: '%',
    weight: 30,
    score: 94,
    createdAt: '2024-01-01',
    updatedAt: '2024-02-15',
  },
  {
    id: 'kpi-2' as KPI['id'],
    employeeId: 'emp-1' as KPI['employeeId'],
    cycleId: 'cycle-2024-q1' as KPI['cycleId'],
    name: 'Code Quality Score',
    description: 'Weighted average of code review scores',
    target: 80,
    actual: 88,
    unit: '%',
    weight: 25,
    score: 110,
    createdAt: '2024-01-01',
    updatedAt: '2024-02-15',
  },
];

const mockReviewStatus: ReviewStatus = 'pending_self';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaysUntil(dateString: string): number {
  const target = new Date(dateString);
  const today = new Date();
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function PerformancePage(): ReactNode {
  const avgOkrProgress = mockOKRs.length > 0
    ? Math.round(mockOKRs.reduce((sum, okr) => sum + okr.progressPercentage, 0) / mockOKRs.length)
    : 0;

  const avgKpiScore = mockKPIs.length > 0
    ? Math.round(mockKPIs.reduce((sum, kpi) => sum + kpi.score, 0) / mockKPIs.length)
    : 0;

  const selfAssessmentDays = mockCycle.selfAssessmentDeadline
    ? getDaysUntil(mockCycle.selfAssessmentDeadline)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Performance</h1>
        <p className="text-muted-foreground">
          Track your objectives, KPIs, and performance reviews
        </p>
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
                <h2 className="font-semibold">{mockCycle.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {formatDate(mockCycle.startDate)} - {formatDate(mockCycle.endDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">Active Cycle</Badge>
              {selfAssessmentDays !== null && selfAssessmentDays > 0 && selfAssessmentDays <= 14 && (
                <Badge variant="warning" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {selfAssessmentDays} days until self-assessment
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>
              Overview of your performance metrics for this cycle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <ProgressGauge
                value={avgOkrProgress}
                label="OKR Progress"
                size="md"
              />
              <ProgressGauge
                value={avgKpiScore > 100 ? 100 : avgKpiScore}
                label="KPI Score"
                size="md"
              />
              <div className="flex flex-col items-center justify-center">
                <ReviewStatusBadge status={mockReviewStatus} />
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  Review Status
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockCycle.selfAssessmentDeadline && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Self-Assessment</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(mockCycle.selfAssessmentDeadline)}
                  </p>
                </div>
                {selfAssessmentDays !== null && (
                  <Badge variant={selfAssessmentDays <= 7 ? 'error' : 'warning'}>
                    {selfAssessmentDays > 0 ? `${selfAssessmentDays}d` : 'Due'}
                  </Badge>
                )}
              </div>
            )}
            {mockCycle.managerReviewDeadline && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Manager Review</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(mockCycle.managerReviewDeadline)}
                  </p>
                </div>
                <Badge variant="secondary">
                  {getDaysUntil(mockCycle.managerReviewDeadline)}d
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* OKRs Card */}
        <Link href="/performance/okrs" className="block">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                  <Target className="h-6 w-6 text-success" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">OKRs</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {mockOKRs.length} objectives with {mockOKRs.reduce((sum, okr) => sum + okr.keyResults.length, 0)} key results
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Average Progress</span>
                  <span className="font-medium">{avgOkrProgress}%</span>
                </div>
                <Progress value={avgOkrProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* KPIs Card */}
        <Link href="/performance/kpis" className="block">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                  <BarChart3 className="h-6 w-6 text-warning" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">KPIs</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {mockKPIs.length} key performance indicators
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Average Score</span>
                  <span className="font-medium">{avgKpiScore}%</span>
                </div>
                <Progress
                  value={Math.min(avgKpiScore, 100)}
                  className="h-2"
                  indicatorClassName={avgKpiScore >= 100 ? 'bg-success' : avgKpiScore >= 80 ? 'bg-warning' : 'bg-error'}
                />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Self-Assessment Card */}
        <Link href="/performance/review" className="block">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Self-Assessment</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Complete your performance self-review
              </p>
              <div className="flex items-center gap-2">
                <ReviewStatusBadge status={mockReviewStatus} />
                {mockReviewStatus === 'pending_self' && (
                  <Button size="sm" className="ml-auto">
                    Start Review
                  </Button>
                )}
                {mockReviewStatus === 'completed' && (
                  <CheckCircle2 className="h-5 w-5 text-success ml-auto" />
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent OKR Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent OKR Updates</CardTitle>
              <CardDescription>Latest progress on your objectives</CardDescription>
            </div>
            <Link href="/performance/okrs">
              <Button variant="outline" size="sm">
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockOKRs.slice(0, 2).map((okr) => (
              <div
                key={okr.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Target className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{okr.objective}</p>
                    <p className="text-sm text-muted-foreground">
                      {okr.keyResults.length} key result{okr.keyResults.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-lg font-semibold">{okr.progressPercentage}%</p>
                    <p className="text-xs text-muted-foreground">progress</p>
                  </div>
                  <div className="w-24 hidden md:block">
                    <Progress value={okr.progressPercentage} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
