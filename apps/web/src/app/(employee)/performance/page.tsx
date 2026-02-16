'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  ProgressGauge,
  type ReviewStatus,
  ReviewStatusBadge,
} from '@hr-portal/ui';
import { usePerformanceCycles, usePerformanceKPIs, usePerformanceOKRs, usePerformanceReviews } from '@/hooks/usePerformance';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';



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
  const { data: cycles = [] } = usePerformanceCycles();
  const activeCycle = cycles.find((cycle) => cycle.status === 'active') || cycles[0] || null;
  const { data: okrs = [] } = usePerformanceOKRs(activeCycle?.id);
  const { data: kpis = [] } = usePerformanceKPIs(activeCycle?.id);
  const { data: reviews = [] } = usePerformanceReviews(activeCycle?.id);

  const cycle = activeCycle;
  const currentOkrs = okrs;
  const currentKpis = kpis;
  const reviewStatus: ReviewStatus = reviews[0]?.status || 'pending_self';

  const avgOkrProgress =
    currentOkrs.length > 0
      ? Math.round(
          currentOkrs.reduce((sum, okr) => sum + okr.progressPercentage, 0) / currentOkrs.length
        )
      : 0;

  const avgKpiScore =
    currentKpis.length > 0
      ? Math.round(currentKpis.reduce((sum, kpi) => sum + kpi.score, 0) / currentKpis.length)
      : 0;

  const selfAssessmentDays = cycle?.selfAssessmentDeadline
    ? getDaysUntil(cycle.selfAssessmentDeadline)
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
                <h2 className="font-semibold">{cycle?.name || 'No Active Cycle'}</h2>
                <p className="text-sm text-muted-foreground">
                  {cycle ? `${formatDate(cycle.startDate)} - ${formatDate(cycle.endDate)}` : 'No performance cycle has been created yet'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cycle ? (
                <Badge variant="success">Active Cycle</Badge>
              ) : (
                <Badge variant="secondary">No Cycle</Badge>
              )}
              {selfAssessmentDays !== null &&
                selfAssessmentDays > 0 &&
                selfAssessmentDays <= 14 && (
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
            <CardDescription>Overview of your performance metrics for this cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <ProgressGauge value={avgOkrProgress} label="OKR Progress" size="md" />
              <ProgressGauge
                value={avgKpiScore > 100 ? 100 : avgKpiScore}
                label="KPI Score"
                size="md"
              />
              <div className="flex flex-col items-center justify-center">
                <ReviewStatusBadge status={reviewStatus} />
                <p className="mt-2 text-sm text-muted-foreground text-center">Review Status</p>
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
            {cycle?.selfAssessmentDeadline ? (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Self-Assessment</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(cycle.selfAssessmentDeadline)}
                  </p>
                </div>
                {selfAssessmentDays !== null && (
                  <Badge variant={selfAssessmentDays <= 7 ? 'error' : 'warning'}>
                    {selfAssessmentDays > 0 ? `${selfAssessmentDays}d` : 'Due'}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No deadlines set</p>
            )}
            {cycle?.managerReviewDeadline && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Manager Review</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(cycle.managerReviewDeadline)}
                  </p>
                </div>
                <Badge variant="secondary">{getDaysUntil(cycle.managerReviewDeadline)}d</Badge>
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
                {currentOkrs.length} objectives with{' '}
                {currentOkrs.reduce((sum, okr) => sum + okr.keyResults.length, 0)} key results
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
                {currentKpis.length} key performance indicators
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Average Score</span>
                  <span className="font-medium">{avgKpiScore}%</span>
                </div>
                <Progress
                  value={Math.min(avgKpiScore, 100)}
                  className="h-2"
                  indicatorClassName={
                    avgKpiScore >= 100
                      ? 'bg-success'
                      : avgKpiScore >= 80
                        ? 'bg-warning'
                        : 'bg-error'
                  }
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
                <ReviewStatusBadge status={reviewStatus} />
                {reviewStatus === 'pending_self' && (
                  <Button size="sm" className="ml-auto">
                    Start Review
                  </Button>
                )}
                {reviewStatus === 'completed' && (
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
            {currentOkrs.slice(0, 2).map((okr) => (
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
