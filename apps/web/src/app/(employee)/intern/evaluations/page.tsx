'use client';

import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import {
  useAssociateEvaluations,
  useInternship,
  useInternships,
  type AssociateEvaluationRecord,
} from '@/hooks/useInternships';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from '@hr-portal/ui';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Loader2,
  Star,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

const ASSOCIATE_STAGE_LABELS: Record<1 | 2 | 3 | 4, { name: string; description: string }> = {
  1: { name: '0-30 Days', description: 'Orientation and settling in' },
  2: { name: '30-60 Days', description: 'Progress check' },
  3: { name: '60-90 Days', description: 'Readiness review' },
  4: { name: '90+ Days', description: 'Final evaluation' },
};

function getAssociateStage(startDate: string, endDate: string): 1 | 2 | 3 | 4 {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const elapsed = Math.max(0, Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const ratio = elapsed / totalDays;

  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function renderStars(rating: number): Array<ReactNode> {
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      className={index < rating ? 'h-4 w-4 fill-yellow-400 text-yellow-400' : 'h-4 w-4 text-zinc-300 dark:text-zinc-600'}
    />
  ));
}

type AssociateStage = 1 | 2 | 3 | 4;

function EvaluationHistoryCard({
  stage,
  currentStage,
  evaluation,
  selected,
  onSelect,
}: {
  stage: AssociateStage;
  currentStage: AssociateStage;
  evaluation: AssociateEvaluationRecord | null;
  selected: boolean;
  onSelect: () => void;
}): ReactNode {
  const stageMeta = ASSOCIATE_STAGE_LABELS[stage];
  const isCurrent = currentStage === stage;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full rounded-xl border p-4 text-left transition-colors',
        selected
          ? 'border-slate-900 bg-slate-50 dark:border-zinc-100 dark:bg-zinc-800/80'
          : 'border-zinc-200 bg-card hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{stageMeta.name}</p>
            {isCurrent ? <Badge variant="secondary">Current stage</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{stageMeta.description}</p>
        </div>
        {evaluation ? (
          <Badge variant="success">Submitted</Badge>
        ) : (
          <Badge variant="outline">Pending</Badge>
        )}
      </div>

      {evaluation ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-1">{renderStars(evaluation.overallPerformance)}</div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Submitted {formatDate(evaluation.evaluatedAt)}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          No submitted evaluation for this stage yet.
        </p>
      )}
    </button>
  );
}

export default function InternEvaluationsPage(): ReactNode {
  const listQuery = useInternships({ page: 1, pageSize: 1, status: 'active' });
  const activeInternshipId = listQuery.data?.data?.[0]?.id ?? null;
  const detailQuery = useInternship(activeInternshipId, !!activeInternshipId);
  const evaluationsQuery = useAssociateEvaluations(activeInternshipId, !!activeInternshipId);
  const [selectedStage, setSelectedStage] = useState<AssociateStage | null>(null);

  const profile = detailQuery.data?.data;
  const evaluations = evaluationsQuery.data?.data ?? [];
  const isLoading = listQuery.isLoading || detailQuery.isLoading || evaluationsQuery.isLoading;

  const currentStage = useMemo<AssociateStage | null>(() => {
    if (!profile) return null;
    return getAssociateStage(profile.startDate, profile.endDate);
  }, [profile]);

  const evaluationByStage = useMemo(() => {
    return evaluations.reduce<Partial<Record<AssociateStage, AssociateEvaluationRecord>>>((accumulator, evaluation) => {
      accumulator[evaluation.stage] = evaluation;
      return accumulator;
    }, {});
  }, [evaluations]);

  useEffect(() => {
    if (!currentStage) return;
    if (selectedStage && evaluationByStage[selectedStage]) return;

    const preferredStage = (currentStage && evaluationByStage[currentStage] ? currentStage : null) ??
      (evaluations[0]?.stage ?? currentStage);

    setSelectedStage(preferredStage);
  }, [currentStage, evaluationByStage, evaluations, selectedStage]);

  const selectedEvaluation = selectedStage ? evaluationByStage[selectedStage] ?? null : null;
  const completedCount = evaluations.length;
  const averageRating =
    evaluations.length > 0
      ? Math.round((evaluations.reduce((sum, evaluation) => sum + evaluation.overallPerformance, 0) / evaluations.length) * 10) / 10
      : 0;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading evaluation history...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-full max-w-xl rounded-xl border border-zinc-200 bg-card p-8 text-center shadow-sm dark:border-zinc-800">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-900/40">
            <GraduationCap className="h-7 w-7 text-slate-700 dark:text-zinc-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Evaluation history becomes available after internship assignment
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Once your internship assignment is active, submitted 30-60-90 evaluations will appear here.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/associate/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            30-60-90 Evaluation History
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Review the submitted assessments from your admin or super-admin across each internship stage.
          </p>
        </div>
        <Link href="/associate/dashboard">
          <Button variant="outline">
            Back to Dashboard
            <ChevronRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
          </Button>
        </Link>
      </div>

      <StatCardGrid columns={3}>
        <StatCard
          label="Current Stage"
          value={currentStage ? ASSOCIATE_STAGE_LABELS[currentStage].name : '—'}
          trend={{ direction: 'stable', value: 'Based on your internship timeline' }}
          icon={<Calendar className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Submitted Reviews"
          value={completedCount}
          trend={{ direction: 'stable', value: `${Math.max(0, 4 - completedCount)} stage(s) pending` }}
          icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Average Rating"
          value={evaluations.length > 0 ? `${averageRating}/5` : '—'}
          trend={{ direction: 'stable', value: evaluations.length > 0 ? 'Across submitted stages' : 'No ratings yet' }}
          icon={<Target className="h-4 w-4" strokeWidth={1.5} />}
        />
      </StatCardGrid>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle>Stage Timeline</CardTitle>
            <CardDescription>Select a stage to review the recorded evaluation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {([1, 2, 3, 4] as AssociateStage[]).map((stage) => (
              <EvaluationHistoryCard
                key={stage}
                stage={stage}
                currentStage={currentStage ?? 1}
                evaluation={evaluationByStage[stage] ?? null}
                selected={selectedStage === stage}
                onSelect={() => setSelectedStage(stage)}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>
                  {selectedStage ? ASSOCIATE_STAGE_LABELS[selectedStage].name : 'Evaluation details'}
                </CardTitle>
                <CardDescription>
                  {selectedStage ? ASSOCIATE_STAGE_LABELS[selectedStage].description : 'Select a stage to inspect the review.'}
                </CardDescription>
              </div>
              {selectedEvaluation ? (
                <Badge variant="success">Submitted {formatDate(selectedEvaluation.evaluatedAt)}</Badge>
              ) : selectedStage ? (
                <Badge variant="outline">Pending</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedStage ? (
              <EmptyState
                icon={Target}
                title="Pick a stage"
                description="Choose a stage from the timeline to view its evaluation details."
              />
            ) : !selectedEvaluation ? (
              <EmptyState
                icon={Clock}
                title="Evaluation not submitted yet"
                description={`Your ${ASSOCIATE_STAGE_LABELS[selectedStage].name} evaluation has not been submitted yet. You'll see the full review here once your admin or super-admin completes it.`}
              />
            ) : (
              <div className="space-y-6">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Evaluation summary
                      </p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Last updated {formatDate(selectedEvaluation.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">{renderStars(selectedEvaluation.overallPerformance)}</div>
                  </div>
                </div>

                <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Overall assessment</h2>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                    {selectedEvaluation.overallAssessment}
                  </p>
                </section>

                <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Key strengths</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                    {selectedEvaluation.keyStrengths}
                  </p>
                </section>

                <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Areas for continued growth</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                    {selectedEvaluation.areasForContinuedGrowth}
                  </p>
                </section>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}