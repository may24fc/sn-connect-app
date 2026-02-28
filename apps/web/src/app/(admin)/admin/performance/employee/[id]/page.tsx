'use client';

import {
  type IndividualPerformanceData,
  useIndividualPerformance,
} from '@/hooks/useIndividualPerformance';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Crosshair,
  Star,
  Target,
  Weight,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';

// ─── Helpers ────────────────────────────────────────────────────

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

function getProgressBarColor(value: number): string {
  if (value >= 75) return 'bg-emerald-500';
  if (value >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

// Compute progress for a single target
function computeTargetProgress(target: IndividualPerformanceData['okrTargets'][number]): number {
  if (target.metric_type === 'boolean') {
    return target.current_value >= 1 ? 100 : 0;
  }
  const range = target.target_value - target.start_value;
  if (range <= 0) return target.current_value >= target.target_value ? 100 : 0;
  const progress = ((target.current_value - target.start_value) / range) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

// Compute weighted mean progress for a set of targets
function computeWeightedMean(targets: IndividualPerformanceData['okrTargets']): number {
  if (targets.length === 0) return 0;
  const totalWeight = targets.reduce((sum, t) => sum + t.weight, 0);
  if (totalWeight === 0) {
    // Equal weighting fallback
    const avg = targets.reduce((sum, t) => sum + computeTargetProgress(t), 0) / targets.length;
    return Math.round(avg);
  }
  const weighted = targets.reduce((sum, t) => sum + computeTargetProgress(t) * t.weight, 0);
  return Math.round(weighted / totalWeight);
}

function metricTypeLabel(type: string): string {
  switch (type) {
    case 'number':
      return 'Number';
    case 'boolean':
      return 'True/False';
    case 'currency':
      return 'Currency';
    case 'tasks':
      return 'Task';
    default:
      return type;
  }
}

// ─── Types ──────────────────────────────────────────────────────

interface ObjectiveWithTargets {
  okr: IndividualPerformanceData['okrs'][number];
  targets: IndividualPerformanceData['okrTargets'];
  mean: number;
}

// ─── Component ──────────────────────────────────────────────────

export default function EmployeePerformanceDetailPage(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const { data, isLoading, isError } = useIndividualPerformance(employeeId);
  const [expandedOkrs, setExpandedOkrs] = useState<Set<string>>(new Set());

  // Build per-objective data with grouped targets
  const objectives: ObjectiveWithTargets[] = useMemo(() => {
    if (!data) return [];
    return data.okrs.map((okr) => {
      const targets = (data.okrTargets || [])
        .filter((t) => t.okr_id === okr.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      return { okr, targets, mean: computeWeightedMean(targets) };
    });
  }, [data]);

  // Overall weighted mean across all objectives (weighted by each OKR's weight)
  const overallWeightedMean = useMemo(() => {
    if (objectives.length === 0) return 0;
    const totalWeight = objectives.reduce((sum, o) => sum + (o.okr.weight || 0), 0);
    if (totalWeight === 0) {
      const avg = objectives.reduce((sum, o) => sum + o.mean, 0) / objectives.length;
      return Math.round(avg);
    }
    const weighted = objectives.reduce(
      (sum, o) => sum + o.mean * (o.okr.weight || 0),
      0
    );
    return Math.round(weighted / totalWeight);
  }, [objectives]);

  const toggleOkrExpanded = (okrId: string): void => {
    setExpandedOkrs((prev) => {
      const next = new Set(prev);
      if (next.has(okrId)) {
        next.delete(okrId);
      } else {
        next.add(okrId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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

  const { employee, okrs, reviews } = data;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back button */}
      <Link href="/admin/performance/individual">
        <Button variant="ghost" size="sm" className="w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
          Back to Individual List
        </Button>
      </Link>

      {/* Employee Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.avatarUrl || undefined} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(employee.fullName || 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground">
                {employee.fullName}
              </h1>
              <p className="text-sm text-muted-foreground">
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
                  <span className="text-xs text-muted-foreground">
                    Hired {formatDate(employee.dateHired)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Weighted Mean */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <h2 className="text-base font-semibold text-foreground">
                Overall Performance Score
              </h2>
            </div>
            <span
              className={`text-3xl font-bold tabular-nums ${getProgressColor(overallWeightedMean)}`}
            >
              {overallWeightedMean}%
            </span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(overallWeightedMean)}`}
              style={{ width: `${overallWeightedMean}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Weighted mean across {objectives.length} objective{objectives.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Detail Tabs */}
      <Tabs defaultValue="objectives">
        <TabsList>
          <TabsTrigger value="objectives">Objectives ({okrs.length})</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
        </TabsList>

        {/* Objectives Tab */}
        <TabsContent value="objectives" className="mt-4">
          {objectives.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target
                  className="h-8 w-8 text-muted-foreground/40 mb-2"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-muted-foreground">No objectives assigned</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {objectives.map(({ okr, targets, mean }) => {
                const isExpanded = expandedOkrs.has(okr.id);

                return (
                  <Card key={okr.id} className="overflow-hidden">
                    {/* Objective Header - clickable to expand */}
                    <button
                      type="button"
                      onClick={() => toggleOkrExpanded(okr.id)}
                      className="w-full text-left p-4 hover:bg-muted/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-foreground truncate">
                                {okr.objective}
                              </h3>
                              <Badge
                                className={`text-xs capitalize shrink-0 ${getStatusColor(okr.status)}`}
                              >
                                {okr.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            {okr.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {okr.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Weight className="h-3 w-3" />
                                <span>Weight: {okr.weight}%</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Target className="h-3 w-3" />
                                <span>
                                  {targets.length} target{targets.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Mean progress circle */}
                        <div className="flex flex-col items-center shrink-0">
                          <span
                            className={`text-xl font-bold tabular-nums ${getProgressColor(mean)}`}
                          >
                            {mean}%
                          </span>
                          <span className="text-[10px] text-muted-foreground">mean</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 ml-7">
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(mean)}`}
                            style={{ width: `${mean}%` }}
                          />
                        </div>
                      </div>
                    </button>

                    {/* Expanded: Target Details */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/10">
                        {targets.length === 0 ? (
                          <div className="px-6 py-6 text-center">
                            <p className="text-sm text-muted-foreground">
                              No targets defined for this objective
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-border">
                            {targets.map((target) => {
                              const targetProgress = computeTargetProgress(target);
                              return (
                                <div key={target.id} className="px-6 py-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        {targetProgress >= 100 ? (
                                          <CheckCircle2
                                            className="h-4 w-4 text-emerald-500 shrink-0"
                                            strokeWidth={1.5}
                                          />
                                        ) : (
                                          <Clock
                                            className="h-4 w-4 text-muted-foreground shrink-0"
                                            strokeWidth={1.5}
                                          />
                                        )}
                                        <span className="text-sm font-medium text-foreground truncate">
                                          {target.name}
                                        </span>
                                      </div>
                                      {target.description && (
                                        <p className="text-xs text-muted-foreground mt-1 ml-6">
                                          {target.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-3 mt-2 ml-6 flex-wrap">
                                        <Badge variant="outline" className="text-[10px]">
                                          {metricTypeLabel(target.metric_type)}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                          {target.metric_type === 'boolean'
                                            ? target.current_value >= 1
                                              ? 'Done'
                                              : 'Not Done'
                                            : `${target.current_value}${target.unit ? ` ${target.unit}` : ''} / ${target.target_value}${target.unit ? ` ${target.unit}` : ''}`}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          Weight: {target.weight}%
                                        </span>
                                      </div>
                                    </div>
                                    <span
                                      className={`text-sm font-semibold tabular-nums shrink-0 ${getProgressColor(targetProgress)}`}
                                    >
                                      {targetProgress}%
                                    </span>
                                  </div>
                                  <div className="mt-2 ml-6">
                                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(targetProgress)}`}
                                        style={{ width: `${targetProgress}%` }}
                                      />
                                    </div>
                                  </div>
                                  {target.admin_comments && (
                                    <p className="text-xs text-muted-foreground mt-2 ml-6 italic">
                                      Admin: "{target.admin_comments}"
                                    </p>
                                  )}
                                  {target.admin_rating && (
                                    <div className="flex items-center gap-1 mt-1 ml-6">
                                      <Star
                                        className="h-3 w-3 text-amber-500"
                                        strokeWidth={1.5}
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        Rating: {target.admin_rating}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* OKR-level admin comments */}
                        {okr.admin_comments && (
                          <div className="px-6 py-3 bg-muted/20 border-t border-border">
                            <p className="text-xs text-muted-foreground italic">
                              Objective comment: "{okr.admin_comments}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}
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
                <Star
                  className="h-8 w-8 text-muted-foreground/40 mb-2"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-muted-foreground">No performance reviews yet</p>
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
                        <p className="text-xs text-muted-foreground">Self Rating</p>
                        <p className="text-lg font-semibold text-foreground tabular-nums">
                          {review.self_rating ?? '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Manager Rating</p>
                        <p className="text-lg font-semibold text-foreground tabular-nums">
                          {review.manager_rating ?? '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Final Rating</p>
                        <p className="text-lg font-semibold text-foreground tabular-nums">
                          {review.final_rating ?? '—'}
                        </p>
                      </div>
                    </div>
                    {review.completed_at && (
                      <p className="text-xs text-muted-foreground mt-3">
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
