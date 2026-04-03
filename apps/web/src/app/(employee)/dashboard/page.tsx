'use client';

import {
  BentoCard,
  BentoCardContent,
  BentoCardHeader,
  BentoCardTitle,
  BentoGrid,
  StatCard,
  StatCardGrid,
} from '@/components/data-display';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnouncementFeed } from '@/hooks/useAnnouncementFeed';
import { CompanyPulseWidget } from '@/components/CompanyPulseWidget';
import { useEmployeeDashboardAttentionItems } from '@/hooks/useEmployeeDashboardAttentionItems';
import { useMilestones } from '@/hooks/useMilestones';
import { useMyProbation } from '@/hooks/useMyProbation';
import { useOnboardingProgressSummary } from '@/hooks/useOnboardingProgressSummary';
import { ROLE_TYPE_REGISTRY, useKPIEntries, useRoleMetadata } from '@/hooks/useRoleMetadata';
import { useTasks } from '@/hooks/useTasks';
import { useTasksRealtime } from '@/hooks/useTasksRealtime';
import KPIEntryWidget from './components/KPIEntryWidget';
import { Badge, Button, DashboardAttentionCarousel, EmptyState, MilestoneBanner, Progress, RoleDashboardWidget, Skeleton } from '@hr-portal/ui';
import type { KPICardData } from '@hr-portal/ui';
import {
  Bell,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const announcementCategoryLabels: Record<string, string> = {
  hr_updates: 'HR Updates',
  benefits: 'Benefits',
  events: 'Events',
  performance: 'Performance',
  training: 'Training',
  policy: 'Policy',
  general: 'General',
  emergency: 'Emergency',
};

function getAnnouncementCategoryLabel(category: string): string {
  return announcementCategoryLabels[category] ?? category.replace(/_/g, ' ');
}

function getAnnouncementCategoryBadgeVariant(
  category: string
): 'error' | 'warning' | 'success' | 'secondary' | 'navy' {
  switch (category) {
    case 'emergency':
      return 'error';
    case 'policy':
      return 'warning';
    case 'benefits':
      return 'success';
    case 'training':
    case 'events':
      return 'secondary';
    case 'performance':
    case 'hr_updates':
    case 'general':
    default:
      return 'navy';
  }
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage(): ReactNode {
  const { user } = useAuth();
  const router = useRouter();
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
  const probationState = probationResponse?.probationState ?? 'none';
  const completedProbationDate =
    probationData?.completedAt && probationState === 'completed'
      ? new Date(probationData.completedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

  // Milestones — upcoming birthdays & anniversaries
  const { data: milestonesData, isLoading: milestonesLoading } = useMilestones({ days: 14 });
  const milestones = milestonesData?.data ?? [];

  // Onboarding progress — based on actual field/document completion plus checklist state
  const {
    profile: onboardingProfile,
    progressPercent: onboardingProgress,
    tasksRemainingCount,
    isLoading: isOnboardingLoading,
  } = useOnboardingProgressSummary();
  const isOnboardingCompleted = onboardingProfile?.is_completed === true;
  const hasOnboardingData = onboardingProfile !== null;

  // Announcements — live data from feed API
  const { data: announcementFeedData, isLoading: isAnnouncementsLoading } = useAnnouncementFeed({
    page: 1,
    pageSize: 5,
  });
  const announcements = announcementFeedData?.data ?? [];

  // Attention items — nudge for incomplete onboarding, pending tasks, etc.
  const { items: attentionItems, isLoading: isAttentionLoading } =
    useEmployeeDashboardAttentionItems();

  // Stat card columns adjust when onboarding is hidden
  const statColumns = isOnboardingCompleted ? 2 : 3;

  return (
    <div className="h-full space-y-6">
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

      {/* Needs Action Carousel */}
      <DashboardAttentionCarousel
        items={attentionItems}
        isLoading={isAttentionLoading}
        onNavigate={(path) => router.push(path)}
      />

      {/* Stats Row */}
      <div data-tour="stat-cards">
        <StatCardGrid columns={statColumns as 2 | 3}>
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
            />
          )}
          <StatCard
            label="Probation"
            value={
              isProbationLoading
                ? '—'
                : probationState === 'active' && probationData
                  ? `${probationData.daysRemaining} ${probationData.daysRemaining === 1 ? 'day' : 'days'}`
                  : probationState === 'completed'
                    ? 'Done'
                  : 'N/A'
            }
            trend={{
              direction: probationState === 'active' && probationData
                ? probationData.status === 'at-risk'
                  ? 'down'
                  : 'up'
                : probationState === 'completed'
                  ? 'up'
                : 'stable',
              value: isProbationLoading
                ? 'Loading…'
                : probationState === 'active' && probationData
                  ? `${probationData.status === 'at-risk' ? 'At risk — ' : probationData.status === 'extended' ? 'Extended — ' : ''}${probationData.progressPercent}% complete`
                  : probationState === 'completed'
                    ? completedProbationDate
                      ? `Completed on ${completedProbationDate}`
                      : 'Probation completed'
                  : 'No active period',
            }}
            icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Tasks Due"
            value={String(tasksDueCount)}
            trend={{
              direction: 'stable',
              value: tasksDueCount > 0 ? `${tasksDueCount} active task(s)` : 'No pending tasks',
            }}
            icon={<ClipboardCheck className="h-4 w-4" strokeWidth={1.5} />}
          />
        </StatCardGrid>
      </div>

      {/* Main Bento Grid */}
      <BentoGrid columns={4}>
        {/* Onboarding Progress (only if not completed) */}
        {!isOnboardingCompleted && (
          <BentoCard colSpan={4}>
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
                      {tasksRemainingCount} checklist item{tasksRemainingCount === 1 ? '' : 's'} remaining
                    </span>
                    <Link
                      href="/onboarding"
                      className="inline-flex items-center text-sm font-medium text-slate-700 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
                    >
                      Open checklist
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
        )}

        {/* Company Calendar Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<Calendar className="h-4 w-4" strokeWidth={1.5} />}>
              Company Calendar
            </BentoCardTitle>
            <Link href="/calendar">
              <Button variant="ghost" size="xs">
                View Calendar
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </BentoCardHeader>
          <BentoCardContent>
            <CompanyPulseWidget />
          </BentoCardContent>
        </BentoCard>

        {/* Latest Announcements Card */}
        <BentoCard colSpan={2} data-tour="announcements">
          <BentoCardHeader>
            <BentoCardTitle icon={<Bell className="h-4 w-4" strokeWidth={1.5} />}>
              Latest Announcements
            </BentoCardTitle>
            <Link href="/announcements">
              <Button variant="ghost" size="xs">
                View All
                <ChevronRight className="h-3.5 w-3.5" />
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
                          <Badge
                            variant={getAnnouncementCategoryBadgeVariant(announcement.category)}
                            className="h-6 border-transparent px-2.5 text-[11px] font-medium"
                          >
                            {getAnnouncementCategoryLabel(announcement.category)}
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

      {/* Role-Specific KPI Dashboard */}
      {primaryKPIRole && kpiCardData.length > 0 && (
        <BentoGrid columns={4}>
          <BentoCard colSpan={4}>
            <BentoCardHeader>
              <BentoCardTitle icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}>
                Role Performance
              </BentoCardTitle>
            </BentoCardHeader>
            <BentoCardContent>
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
            </BentoCardContent>
          </BentoCard>
        </BentoGrid>
      )}
    </div>
  );
}
