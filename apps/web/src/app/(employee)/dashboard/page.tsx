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
import { useTasks } from '@/hooks/useTasks';
import { useTasksRealtime } from '@/hooks/useTasksRealtime';
import {
  useRoleMetadata,
  useKPIEntries,
  ROLE_TYPE_REGISTRY,
} from '@/hooks/useRoleMetadata';
import { Badge, Button, Progress, RoleDashboardWidget } from '@hr-portal/ui';
import type { KPICardData } from '@hr-portal/ui';
import {
  Bell,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  FolderOpen,
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
  {
    title: 'View Calendar',
    icon: Calendar,
    href: '/calendar',
  },
  {
    title: 'Request Leave',
    icon: Clock,
    href: '/leave',
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
        return {
          name: m.name,
          label: m.label,
          value: entry.kpi_value,
          unit: m.unit,
        };
      });
  })();

  // Data would come from API hooks - showing UI structure without data
  const onboardingProgress = 0;
  const hasOnboardingData = false;
  const announcements: Array<{ id: string; title: string; date: string; category: string }> = [];
  const upcomingEvents: Array<{ title: string; date: string; time: string }> = [];

  return (
    <div className="h-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 mt-1">
            Here is what is happening with your HR journey today.
          </p>
        </div>
        <Button asChild>
          <Link href="/files">
            <FolderOpen className="mr-2 h-4 w-4" strokeWidth={1.5} />
            View My Files
          </Link>
        </Button>
      </div>

      {/* Stats Row */}
      <div data-tour="stat-cards">
      <StatCardGrid columns={4}>
        <StatCard
          label="Onboarding"
          value={hasOnboardingData ? `${onboardingProgress}%` : '0%'}
          trend={{ direction: 'stable', value: 'Not started' }}
          icon={<Target className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Probation"
          value="N/A"
          trend={{ direction: 'stable', value: 'No active period' }}
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
        <StatCard
          label="Notifications"
          value="0"
          trend={{ direction: 'stable', value: 'No new notifications' }}
          icon={<Bell className="h-4 w-4" strokeWidth={1.5} />}
        />
      </StatCardGrid>
      </div>

      {/* Main Bento Grid */}
      <BentoGrid columns={4}>
        {/* Quick Actions Card */}
        <BentoCard colSpan={2} data-tour="quick-actions">
          <BentoCardHeader>
            <BentoCardTitle icon={<Target className="h-4 w-4" strokeWidth={1.5} />}>
              Quick Actions
            </BentoCardTitle>
          </BentoCardHeader>
          <BentoCardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <div className="group flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <action.icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200" strokeWidth={1.5} />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {action.title}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </BentoCardContent>
        </BentoCard>

        {/* Onboarding Progress Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<ClipboardCheck className="h-4 w-4" strokeWidth={1.5} />}>
              Onboarding Progress
            </BentoCardTitle>
            <Badge variant="secondary">Not Started</Badge>
          </BentoCardHeader>
          <BentoCardContent>
            {hasOnboardingData ? (
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
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Tasks remaining</span>
                  <Link
                    href="/onboarding"
                    className="inline-flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
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

        {/* Upcoming Events Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<Calendar className="h-4 w-4" strokeWidth={1.5} />}>
              Upcoming Events
            </BentoCardTitle>
            <Link href="/calendar">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                View All
              </Button>
            </Link>
          </BentoCardHeader>
          <BentoCardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" strokeWidth={1.5} />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {event.title}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {event.date} at {event.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No upcoming events"
                description="Your scheduled events will appear here"
              />
            )}
          </BentoCardContent>
        </BentoCard>

        {/* Announcements Card */}
        <BentoCard colSpan={2} data-tour="announcements">
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
            {announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {announcement.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs h-5">
                          {announcement.category}
                        </Badge>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {announcement.date}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0 mt-1"
                      strokeWidth={1.5}
                    />
                  </div>
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

      {/* Role-Specific KPI Dashboard (V2-4.2) */}
      {primaryKPIRole && kpiCardData.length > 0 && (
        <RoleDashboardWidget
          roleType={primaryKPIRole}
          roleLabel={
            ROLE_TYPE_REGISTRY[primaryKPIRole as keyof typeof ROLE_TYPE_REGISTRY]?.label ??
            primaryKPIRole
          }
          kpiData={kpiCardData}
        />
      )}
    </div>
  );
}
