'use client';

import {
  BentoCard,
  BentoCardContent,
  BentoCardHeader,
  BentoCardTitle,
  BentoGrid,
  EmptyState,
  StatCard,
  StatCardGrid,
} from '@/components/data-display';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnouncementFeed } from '@/hooks/useAnnouncementFeed';
import { CompanyPulseWidget } from '@/components/CompanyPulseWidget';
import { useMilestones } from '@/hooks/useMilestones';
import { useMyProbation } from '@/hooks/useMyProbation';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import { ROLE_TYPE_REGISTRY, useKPIEntries, useRoleMetadata } from '@/hooks/useRoleMetadata';
import { useTasks } from '@/hooks/useTasks';
import { useTasksRealtime } from '@/hooks/useTasksRealtime';
import KPIEntryWidget from './components/KPIEntryWidget';
import { Badge, Button, MilestoneBanner, Progress, RoleDashboardWidget, Skeleton } from '@hr-portal/ui';
import type { KPICardData } from '@hr-portal/ui';
import {
  Bell,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

// Quick actions configuration
const quickActions = [
  {
    title: 'Upload Files',
    icon: Upload,
    href: '/files',
  },
  {
    title: 'Submit Report',
    icon: FileText,
    href: '/reports/new',
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage(): ReactNode {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const greeting = getGreeting();

  const { data: tasksResponse } = useTasks(
    {
      ...(user?.id ? { assigneeId: user.id } : {}),
      page: 1,
      pageSize: 100,
    },
    { enabled: Boolean(user?.id) }
  );

  useTasksRealtime({
    scope: 'assigned',
    ...(user?.id ? { userId: user.id } : {}),
    enabled: Boolean(user?.id),
  });

  const assignedTasks = tasksResponse?.data || [];
  const tasksDueCount = assignedTasks.filter((task) => task.status !== 'completed').length;

  // Role-specific KPI data (V2-4.2)
  const { data: metadataRecords = [] } = useRoleMetadata(user?.id);
  const roleTypesWithKPIs = metadataRecords
    .map((r) => r.role_type)
    .filter((rt) => {
      const config = ROLE_TYPE_REGISTRY[rt as keyof typeof ROLE_TYPE_REGISTRY];
      return config?.kpiMetrics && config.kpiMetrics.length > 0;
    });
  const primaryKPIRole = roleTypesWithKPIs.length > 0 ? (roleTypesWithKPIs[0] as string) : '';
  const kpiFilters: { role_type?: string } = primaryKPIRole ? { role_type: primaryKPIRole } : {};
  const { data: kpiEntries = [] } = useKPIEntries(user?.id, kpiFilters);

  // Build KPI card data from latest entries (deduplicated by kpi_name)
  const kpiCardData: KPICardData[] = (() => {
    if (!primaryKPIRole) return [];
    const config = ROLE_TYPE_REGISTRY[primaryKPIRole as keyof typeof ROLE_TYPE_REGISTRY];
    if (!config?.kpiMetrics) return [];

    const latestByName = new Map<string, (typeof kpiEntries)[number]>();
    for (const entry of kpiEntries) {
      const existing = latestByName.get(entry.kpi_name);
      if (!existing || entry.entry_date > existing.entry_date) {
        latestByName.set(entry.kpi_name, entry);
      }
    }

    return config.kpiMetrics
      .filter((m) => latestByName.has(m.name))
      .map((m) => {
        const entry = latestByName.get(m.name)!;
        const previousEntry = kpiEntries
          .filter((item) => item.kpi_name === m.name && item.entry_date < entry.entry_date)
          .sort((left, right) => right.entry_date.localeCompare(left.entry_date))[0];

        let trend:
          | {
              direction: 'up' | 'down' | 'stable';
              value: string;
            }
          | undefined;

        if (previousEntry) {
          const delta = entry.kpi_value - previousEntry.kpi_value;
          if (delta === 0) {
            trend = { direction: 'stable', value: 'No change' };
          } else {
            const formattedDelta = m.unit === '%' ? `${Math.abs(delta).toFixed(2)}%` : `${Math.abs(delta).toFixed(2)}`;
            trend = {
              direction: delta > 0 ? 'up' : 'down',
              value: `${formattedDelta} vs previous`,
            };
          }
        }

        return {
          name: m.name,
          label: m.label,
          value: entry.kpi_value,
          unit: m.unit,
          ...(trend ? { trend } : {}),
        };
      });
  })();

  // Probation status
  const { data: probationResponse, isLoading: isProbationLoading } = useMyProbation(Boolean(user?.id));
  const probationData = probationResponse?.data ?? null;
  const isOnProbation = probationResponse?.onProbation ?? false;

  // Milestones — upcoming birthdays & anniversaries
  const { data: milestonesData, isLoading: milestonesLoading } = useMilestones({ days: 14 });
  const milestones = milestonesData?.data ?? [];

  // Onboarding profile — hide sections when completed
  const { data: onboardingProfileData, isLoading: isOnboardingLoading } = useOnboardingProfile();
  const onboardingProfile = onboardingProfileData?.data ?? null;
  const isOnboardingCompleted = onboardingProfile?.is_completed === true;

  const onboardingStepWeights: Record<string, number> = {
    personal_info: 25,
    payment_info: 50,
    documents: 75,
    review: 90,
  };
  const onboardingProgress = isOnboardingCompleted
    ? 100
    : onboardingProfile?.current_step
      ? (onboardingStepWeights[onboardingProfile.current_step] ?? 0)
      : 0;
  const hasOnboardingData = onboardingProfile !== null;

  // Announcements — live data from feed API
  const { data: announcementFeedData, isLoading: isAnnouncementsLoading } = useAnnouncementFeed({
    page: 1,
    pageSize: 5,
  });
  const announcements = announcementFeedData?.data ?? [];

  // Stat card columns adjust when onboarding is hidden
  const statColumns = isOnboardingCompleted ? 3 : 4;

  return (
    <div className="h-full space-y-5 pb-6">
      {/* ── Section 1: Quick Stats ── */}
      <div className="py-4 space-y-6 border-b border-zinc-100 dark:border-zinc-800/80">
        {/* Section Header */}
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
            Overview
          </h2>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
        </div>

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              {greeting}, {firstName}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Here is what is happening with your HR journey today.
            </p>
          </div>
        </div>

        {/* Milestone Banner — upcoming birthdays & anniversaries */}
        <MilestoneBanner milestones={milestones} isLoading={milestonesLoading} />

        {/* Stats Row */}
        <div data-tour="stat-cards">
          <StatCardGrid columns={statColumns as 3 | 4}>
          {!isOnboardingCompleted && (
            <StatCard
              label="Onboarding"
              value={
                isOnboardingLoading
                  ? '—'
                  : hasOnboardingData
                    ? `${onboardingProgress}%`
                    : '0%'
              }
              trend={{
                direction: 'stable',
                value: isOnboardingLoading
                  ? 'Loading…'
                  : hasOnboardingData
                    ? 'In progress'
                    : 'Not started',
              }}
              icon={<Target className="h-4 w-4" strokeWidth={1.5} />}
              className="border-l-4 border-l-emerald-500 dark:border-l-emerald-400"
            />
          )}
          <StatCard
            label="Probation"
            value={
              isProbationLoading
                ? '—'
                : isOnProbation && probationData
                  ? `${probationData.daysRemaining}d`
                  : 'N/A'
            }
            trend={{
              direction: isOnProbation && probationData
                ? probationData.status === 'at-risk'
                  ? 'down'
                  : 'up'
                : 'stable',
              value: isProbationLoading
                ? 'Loading…'
                : isOnProbation && probationData
                  ? `${probationData.status === 'at-risk' ? 'At risk — ' : probationData.status === 'extended' ? 'Extended — ' : ''}${probationData.progressPercent}% complete`
                  : 'No active period',
            }}
            icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}
            className="border-l-4 border-l-amber-500 dark:border-l-amber-400"
          />
          <StatCard
            label="Tasks Due"
            value={String(tasksDueCount)}
            trend={{
              direction: 'stable',
              value: tasksDueCount > 0 ? `${tasksDueCount} active task(s)` : 'No pending tasks',
            }}
            icon={<ClipboardCheck className="h-4 w-4" strokeWidth={1.5} />}
            className="border-l-4 border-l-indigo-500 dark:border-l-indigo-400"
          />
          <StatCard
            label="Notifications"
            value="0"
            trend={{ direction: 'stable', value: 'No new notifications' }}
            icon={<Bell className="h-4 w-4" strokeWidth={1.5} />}
            className="border-l-4 border-l-violet-500 dark:border-l-violet-400"
          />
        </StatCardGrid>
      </div>
      </div>

      {/* ── Section 2: Onboarding & Activity ── */}
      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/30 px-6 py-5 space-y-5 border border-zinc-100 dark:border-zinc-800/60">
        {/* Section Header */}
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
            Activity &amp; Updates
          </h2>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
        </div>

      {/* Row 1: Onboarding Progress (only if not completed) */}
      {!isOnboardingCompleted && (
        <BentoGrid columns={4}>
          <BentoCard colSpan={4} className="border-l-4 border-l-emerald-500 dark:border-l-emerald-400">
            <BentoCardHeader>
              <BentoCardTitle icon={<ClipboardCheck className="h-4 w-4" strokeWidth={1.5} />}>
                Onboarding Progress
              </BentoCardTitle>
              <Badge variant="secondary">
                {isOnboardingLoading
                  ? 'Loading…'
                  : hasOnboardingData
                    ? 'In Progress'
                    : 'Not Started'}
              </Badge>
            </BentoCardHeader>
            <BentoCardContent>
              {isOnboardingLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ) : hasOnboardingData ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500 dark:text-zinc-400">Overall completion</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {onboardingProgress}%
                      </span>
                    </div>
                    <Progress value={onboardingProgress} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      Tasks remaining
                    </span>
                    <Link
                      href="/onboarding"
                      className="inline-flex items-center text-sm font-medium text-slate-700 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      View checklist
                      <ChevronRight className="ml-1 h-4 w-4" strokeWidth={1.5} />
                    </Link>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No onboarding in progress"
                  description="Your onboarding tasks will appear here when available"
                  action={{ label: 'View Onboarding', href: '/onboarding' }}
                />
              )}
            </BentoCardContent>
          </BentoCard>
        </BentoGrid>
      )}

      {/* Row 2: Company Pulse + Latest Announcements */}
      <BentoGrid columns={4}>
        {/* Company Pulse Card */}
        <BentoCard colSpan={2} className="border-l-4 border-l-indigo-500 dark:border-l-indigo-400">
          <BentoCardHeader>
            <BentoCardTitle icon={<Calendar className="h-4 w-4" strokeWidth={1.5} />}>
              Company Pulse
            </BentoCardTitle>
          </BentoCardHeader>
          <BentoCardContent>
            <CompanyPulseWidget />
          </BentoCardContent>
        </BentoCard>

        {/* Latest Announcements Card — connected to feed API */}
        <BentoCard colSpan={2} data-tour="announcements" className="border-l-4 border-l-amber-500 dark:border-l-amber-400">
          <BentoCardHeader>
            <BentoCardTitle icon={<Bell className="h-4 w-4" strokeWidth={1.5} />}>
              Latest Announcements
            </BentoCardTitle>
            <Link href="/announcements">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                View All
              </Button>
            </Link>
          </BentoCardHeader>
          <BentoCardContent>
            {isAnnouncementsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.map((announcement) => (
                  <Link
                    key={announcement.id}
                    href="/announcements"
                  >
                    <div className="flex items-start justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {announcement.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs h-5">
                            {announcement.category.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {announcement.published_at
                              ? new Date(announcement.published_at).toLocaleDateString()
                              : new Date(announcement.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className="h-4 w-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0 mt-1"
                        strokeWidth={1.5}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Bell}
                title="No announcements"
                description="Company announcements will appear here"
              />
            )}
          </BentoCardContent>
        </BentoCard>
      </BentoGrid>
      </div>

      {/* ── Section 3: Quick Actions ── */}
      <div className="rounded-xl bg-indigo-50/50 dark:bg-indigo-950/15 px-6 py-5 border border-indigo-100 dark:border-indigo-900/40">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-600/80 dark:text-indigo-400/80 whitespace-nowrap">
            Quick Access
          </h2>
          <div className="flex-1 h-px bg-indigo-200/60 dark:bg-indigo-800/40" />
        </div>

      {/* Row 3: Quick Actions — full width */}
      <BentoGrid columns={4}>
        <BentoCard colSpan={4} data-tour="quick-actions" className="border-l-4 border-l-indigo-500 dark:border-l-indigo-400">
          <BentoCardHeader>
            <BentoCardTitle icon={<Target className="h-4 w-4" strokeWidth={1.5} />}>
              Quick Actions
            </BentoCardTitle>
          </BentoCardHeader>
          <BentoCardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <div className="group flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <action.icon
                      className="h-4 w-4 text-zinc-500 dark:text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                      strokeWidth={1.5}
                    />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {action.title}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </BentoCardContent>
        </BentoCard>
      </BentoGrid>
      </div>

      {/* ── Section 4: KPI Dashboard ── */}
      {/* Role-Specific KPI Dashboard (V2-4.2) */}
      {primaryKPIRole && kpiCardData.length > 0 && (
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/30 px-6 py-5 border border-zinc-100 dark:border-zinc-800/60">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              Role Performance
            </h2>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          </div>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <RoleDashboardWidget
            roleType={primaryKPIRole}
            roleLabel={
              ROLE_TYPE_REGISTRY[primaryKPIRole as keyof typeof ROLE_TYPE_REGISTRY]?.label ??
              primaryKPIRole
            }
            kpiData={kpiCardData}
          />
          <KPIEntryWidget />
        </div>
        </div>
      )}
    </div>
  );
}
