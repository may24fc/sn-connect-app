'use client';

import { useIndividualPerformance } from '@/hooks/useIndividualPerformance';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';
import { ArrowLeft, BarChart3, CheckCircle2, Clock, Star, Target, TrendingUp } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
    case 'in_progress':
    case 'active':
      return 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20';
    case 'not_started':
    case 'pending':
      return 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800';
    case 'at_risk':
      return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
    default:
      return 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800';
  }
}

function getProgressColor(value: number): string {
  if (value >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (value >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export default function IndividualPerformancePage(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const { data, isLoading, isError } = useIndividualPerformance(employeeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <p className="text-sm text-red-500">Failed to load performance data</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
          Go Back
        </Button>
      </div>
    );
  }

  const { employee, kpis, kpiSummary, okrs, okrSummary, reviews } = data;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="w-fit" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
        Back to Performance
      </Button>

      {/* Employee Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.avatarUrl || undefined} />
              <AvatarFallback className="text-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                {getInitials(employee.fullName || 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {employee.fullName}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {employee.position || 'No position'} · {employee.department || 'No department'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs capitalize">
                  {employee.role?.replace('_', ' ') || '—'}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {employee.status?.replace('_', ' ') || '—'}
                </Badge>
                {employee.dateHired && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    Hired {formatDate(employee.dateHired)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-500" strokeWidth={1.5} />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">KPIs</span>
            </div>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1 tabular-nums">
              {kpiSummary.completed}/{kpiSummary.total}
            </p>
            <p className={`text-sm font-medium mt-0.5 ${getProgressColor(kpiSummary.avgProgress)}`}>
              {kpiSummary.avgProgress}% avg progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">OKRs</span>
            </div>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1 tabular-nums">
              {okrSummary.completed}/{okrSummary.total}
            </p>
            <p className={`text-sm font-medium mt-0.5 ${getProgressColor(okrSummary.avgProgress)}`}>
              {okrSummary.avgProgress}% avg progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Latest Rating
              </span>
            </div>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1 tabular-nums">
              {data.latestReview &&
              typeof data.latestReview === 'object' &&
              'final_rating' in data.latestReview
                ? String((data.latestReview as { final_rating: number | null }).final_rating ?? '—')
                : '—'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">out of 5.0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-500" strokeWidth={1.5} />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Reviews</span>
            </div>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1 tabular-nums">
              {reviews.length}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">total reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Tabs */}
      <Tabs defaultValue="okrs">
        <TabsList>
          <TabsTrigger value="okrs">Objectives ({okrs.length})</TabsTrigger>
          <TabsTrigger value="kpis">Legacy KPIs ({kpis.length})</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
        </TabsList>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="mt-4">
          {kpis.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target
                  className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No KPIs assigned</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {kpis.map((kpi) => {
                const progress =
                  kpi.target_value > 0
                    ? Math.round((kpi.current_value / kpi.target_value) * 100)
                    : 0;

                return (
                  <Card key={kpi.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{kpi.name}</CardTitle>
                        <Badge className={`text-xs capitalize ${getStatusColor(kpi.status)}`}>
                          {kpi.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {kpi.period_start && kpi.period_end && (
                        <CardDescription className="text-xs">
                          {formatDate(kpi.period_start)} – {formatDate(kpi.period_end)}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-300 tabular-nums">
                            {kpi.current_value} / {kpi.target_value} {kpi.unit || ''}
                          </span>
                          <span
                            className={`font-medium tabular-nums ${getProgressColor(progress)}`}
                          >
                            {progress}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        {kpi.admin_comments && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 italic">
                            "{kpi.admin_comments}"
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* OKRs Tab */}
        <TabsContent value="okrs" className="mt-4">
          {okrs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp
                  className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No OKRs assigned</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {okrs.map((okr) => {
                const progress = Math.round(okr.progress || 0);
                const keyResults = Array.isArray(okr.key_results) ? okr.key_results : [];

                return (
                  <Card key={okr.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{okr.objective}</CardTitle>
                        <Badge className={`text-xs capitalize ${getStatusColor(okr.status)}`}>
                          {okr.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Progress value={progress} className="h-2 flex-1" />
                          <span
                            className={`text-sm font-medium tabular-nums ${getProgressColor(progress)}`}
                          >
                            {progress}%
                          </span>
                        </div>

                        {keyResults.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                              Key Results
                            </p>
                            {keyResults.map(
                              (kr: { title?: string; progress?: number }, i: number) => (
                                <div
                                  key={`kr-${okr.id}-${i}`}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  {(kr.progress || 0) >= 100 ? (
                                    <CheckCircle2
                                      className="h-3.5 w-3.5 text-emerald-500"
                                      strokeWidth={1.5}
                                    />
                                  ) : (
                                    <Clock
                                      className="h-3.5 w-3.5 text-zinc-400"
                                      strokeWidth={1.5}
                                    />
                                  )}
                                  <span className="text-zinc-700 dark:text-zinc-300 flex-1">
                                    {kr.title || `Key Result ${i + 1}`}
                                  </span>
                                  <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                                    {kr.progress || 0}%
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        )}

                        {okr.admin_comments && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                            "{okr.admin_comments}"
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="mt-4">
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" strokeWidth={1.5} />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No performance reviews yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        {review.review_cycles?.name || 'Review'}
                      </CardTitle>
                      <Badge className={`text-xs capitalize ${getStatusColor(review.status)}`}>
                        {review.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {formatDate(review.review_cycles?.start_date)} –{' '}
                      {formatDate(review.review_cycles?.end_date)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Self Rating</p>
                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                          {review.self_rating ?? '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Manager Rating</p>
                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                          {review.manager_rating ?? '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Final Rating</p>
                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                          {review.final_rating ?? '—'}
                        </p>
                      </div>
                    </div>
                    {review.completed_at && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-3">
                        Completed {formatDate(review.completed_at)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
