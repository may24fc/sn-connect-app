'use client';

import { StatCard, StatCardGrid } from '@/components/data-display';
import { AtsAccessManagerButton } from '@/components/admin/AtsAccessManagerDialog';
import { useApplications } from '@/hooks/useApplications';
import { useJobPostings } from '@/hooks/useJobPostings';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@hr-portal/ui';
import {
  Archive,
  ArrowRight,
  Briefcase,
  Building2,
  ClipboardList,
  GraduationCap,
  Loader2,
  MapPin,
  UserCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

const PIPELINE_STATUS_LABELS = {
  pending: 'New',
  reviewed: 'Reviewed',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  approved: 'Ready to hire',
  rejected: 'Rejected',
  hired: 'Hired',
} as const;

const ACTIVE_PIPELINE_STATUSES = new Set([
  'reviewed',
  'shortlisted',
  'interview',
  'approved',
]);

function formatEmploymentType(value: string): string {
  return value
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminRecruitmentPage(): ReactNode {
  const pathname = usePathname();
  const basePath = pathname.startsWith('/ats') ? '/ats' : '/admin';
  const showAccessManager = basePath === '/admin';
  const {
    data: jobsData,
    isLoading: isJobsLoading,
    error: jobsError,
  } = useJobPostings({ page: 1, pageSize: 100 });
  const {
    data: applicationsData,
    isLoading: isApplicationsLoading,
    error: applicationsError,
  } = useApplications({ page: 1, pageSize: 100 });

  const jobs = jobsData?.data ?? [];
  const applications = applicationsData?.data ?? [];
  const isLoading = isJobsLoading || isApplicationsLoading;
  const hasError = Boolean(jobsError || applicationsError);

  const recruitmentStats = useMemo(() => {
    const activeRoles = jobs.filter((job) => job.is_active).length;
    const openSeats = jobs.reduce((total, job) => {
      const requisition = job.job_requisition;
      if (!requisition) return total;
      return total + Math.max(requisition.total_headcount - requisition.filled_headcount, 0);
    }, 0);
    const inPipeline = applications.filter((application) =>
      ACTIVE_PIPELINE_STATUSES.has(application.status)
    ).length;
    const hired = applications.filter((application) => application.status === 'hired').length;

    return {
      activeRoles,
      openSeats,
      inPipeline,
      hired,
    };
  }, [jobs, applications]);

  const applicationCountByJob = useMemo(() => {
    return applications.reduce<Map<string, number>>((counts, application) => {
      if (!application.job_posting_id) return counts;
      counts.set(application.job_posting_id, (counts.get(application.job_posting_id) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());
  }, [applications]);

  const rolesNeedingAttention = useMemo(() => {
    return jobs
      .map((job) => {
        const requisition = job.job_requisition;
        const openSeats = requisition
          ? Math.max(requisition.total_headcount - requisition.filled_headcount, 0)
          : 0;

        return {
          job,
          openSeats,
          applicants: applicationCountByJob.get(job.id) ?? 0,
        };
      })
      .filter(({ job, openSeats, applicants }) => job.is_active || openSeats > 0 || applicants > 0)
      .sort((left, right) => {
        if (right.openSeats !== left.openSeats) {
          return right.openSeats - left.openSeats;
        }
        if (right.applicants !== left.applicants) {
          return right.applicants - left.applicants;
        }
        return right.job.created_at.localeCompare(left.job.created_at);
      })
      .slice(0, 6);
  }, [jobs, applicationCountByJob]);

  const pipelineBreakdown = useMemo(() => {
    return Object.entries(PIPELINE_STATUS_LABELS).map(([status, label]) => ({
      status,
      label,
      count: applications.filter((application) => application.status === status).length,
    }));
  }, [applications]);

  const recentCandidates = useMemo(() => {
    return [...applications]
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, 5);
  }, [applications]);

  return (
    <div className="h-full space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Recruitment
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            ATS command center for approved headcount, active candidates, and final hires.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {showAccessManager ? <AtsAccessManagerButton /> : null}
          <Button asChild variant="outline" size="sm">
            <Link href={`${basePath}/jobs/archive`}>View archive</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`${basePath}/jobs/applications`}>Review applicants</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`${basePath}/jobs`}>Manage postings</Link>
          </Button>
        </div>
      </div>

      <StatCardGrid columns={4}>
        <StatCard
          label="Active roles"
          value={isLoading ? '...' : recruitmentStats.activeRoles}
          icon={<Briefcase className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Open seats"
          value={isLoading ? '...' : recruitmentStats.openSeats}
          icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Candidates in pipeline"
          value={isLoading ? '...' : recruitmentStats.inPipeline}
          icon={<ClipboardList className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Hires completed"
          value={isLoading ? '...' : recruitmentStats.hired}
          icon={<UserCheck className="h-4 w-4" strokeWidth={1.5} />}
        />
      </StatCardGrid>

      {hasError ? (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
              Recruitment data could not be loaded. Refresh the page or retry from the jobs screens.
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Roles needing attention</CardTitle>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Prioritize openings with remaining seats or active candidate volume.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href={`${basePath}/jobs`}>
                All postings
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex min-h-48 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                Loading recruitment overview...
              </div>
            ) : rolesNeedingAttention.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No recruitment activity yet"
                description="Create a posting to start tracking headcount, applicants, and hires from one place."
                action={{
                  label: 'Create a posting',
                  href: `${basePath}/jobs`,
                }}
              />
            ) : (
              <div className="space-y-3">
                {rolesNeedingAttention.map(({ job, openSeats, applicants }) => {
                  const requisition = job.job_requisition;

                  return (
                    <div
                      key={job.id}
                      className="rounded-lg border border-border bg-card/70 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                              {job.title}
                            </h3>
                            <Badge variant={openSeats > 0 ? 'warning' : 'success'}>
                              {openSeats > 0 ? `${openSeats} open seat${openSeats === 1 ? '' : 's'}` : 'Filled'}
                            </Badge>
                            <Badge variant="outline">{applicants} applicants</Badge>
                          </div>

                          <div className="flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                            {job.department ? (
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                                {job.department}
                              </span>
                            ) : null}
                            {job.location ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                                {job.location}
                              </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" strokeWidth={1.5} />
                              {formatEmploymentType(job.employment_type)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1 text-sm text-zinc-500 dark:text-zinc-400 lg:text-right">
                          <div>
                            Filled {requisition?.filled_headcount ?? 0} of {requisition?.total_headcount ?? 0}
                          </div>
                          <div>Created {formatDate(job.created_at)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Pipeline snapshot</CardTitle>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Live counts across the application funnel.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`${basePath}/jobs/applications`}>
                  Open pipeline
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pipelineBreakdown.map(({ status, label, count }) => (
                  <div
                    key={status}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={status === 'hired' ? 'success' : status === 'approved' ? 'warning' : 'secondary'}
                      >
                        {label}
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {isLoading ? '...' : count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Latest candidates</CardTitle>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Newest applicants across all active and archived roles.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`${basePath}/jobs/applications`}>
                  Review queue
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex min-h-32 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                  Loading candidates...
                </div>
              ) : recentCandidates.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No applicants yet"
                  description="Candidate activity will appear here as soon as applications start arriving."
                />
              ) : (
                <div className="space-y-3">
                  {recentCandidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {candidate.full_name}
                        </div>
                        <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {candidate.job_postings?.title ?? 'Unassigned application'}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Applied {formatDate(candidate.created_at)}
                        </div>
                        {candidate.reviewer_display_name ? (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Updated by {candidate.reviewer_display_name}
                          </div>
                          ) : null}
                      </div>
                      <Badge
                        variant={candidate.status === 'hired' ? 'success' : candidate.status === 'approved' ? 'warning' : 'secondary'}
                      >
                        {PIPELINE_STATUS_LABELS[candidate.status] ?? candidate.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Archive</CardTitle>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Review closed roles and previously filled requisitions without leaving recruitment.
              </p>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href={`${basePath}/jobs/archive`}>
                  <Archive className="h-4 w-4" strokeWidth={1.5} />
                  Open archived postings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}