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
import { useDashboardAttentionItems } from '@/hooks/useDashboardAttentionItems';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useMilestones } from '@/hooks/useMilestones';
import { CompanyPulseWidget } from '@/components/CompanyPulseWidget';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { Button, DashboardAttentionCarousel, EmptyState, MilestoneBanner } from '@hr-portal/ui';
import {
  Calendar,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Edit,
  GraduationCap,
  Loader2,
  Activity,
  Plus,
  Settings,
  Target,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function getActionIcon(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes('deleted')) return <Trash2 className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />;
  if (lower.includes('created') || lower.includes('added') || lower.includes('started') || lower.includes('submitted'))
    return <Plus className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />;
  if (lower.includes('updated') || lower.includes('edited'))
    return <Edit className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />;
  return <Activity className="h-4 w-4 text-zinc-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />;
}

export default function AdminDashboardPage(): ReactNode {
  const { user } = useAuth();
  const router = useRouter();
  const firstName = user?.name?.split(' ')[0] ?? 'Admin';
  const greeting = getGreeting();

  const { data: milestonesData, isLoading: milestonesLoading } = useMilestones({ days: 30 });
  const {
    items: attentionItems,
    isLoading: attentionLoading,
    totalCount: attentionCount,
  } = useDashboardAttentionItems('admin');
  const { data: statsData, isLoading: statsLoading } = useDashboardStats();
  const { data: activityData, isLoading: activityLoading } = useRecentActivity(8, {
    scope: 'admin',
  });

  const stats = {
    totalEmployees: statsData?.totalEmployees ?? 0,
    activeInterns: statsData?.activeInterns ?? 0,
    performanceReviews: statsData?.reviewsDue ?? 0,
    recentHires: statsData?.recentHires ?? 0,
  };

  const recentActivities = activityData ?? [];

  return (
    <div className="h-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 mt-1">
            Here is your HR overview for today.
          </p>
        </div>
      </div>

      {/* Pending Approvals */}
      <DashboardAttentionCarousel
        items={attentionItems}
        isLoading={attentionLoading}
        totalCount={attentionCount}
        onNavigate={(path) => router.push(path)}
      />

      {/* Milestone Banner — upcoming birthdays & anniversaries */}
      <MilestoneBanner
        milestones={milestonesData?.data ?? []}
        isLoading={milestonesLoading}
      />

      {/* Stats Row */}
      <div data-tour="stat-cards">
        <StatCardGrid columns={3}>
          <StatCard
            label="Total Employees"
            value={statsLoading ? '—' : stats.totalEmployees}
            trend={{
              direction: stats.recentHires > 0 ? 'up' : 'stable',
              value: statsLoading
                ? 'Loading...'
                : stats.recentHires > 0
                  ? `+${stats.recentHires} this month`
                  : 'No new hires this month',
            }}
            icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Active Interns"
            value={statsLoading ? '—' : stats.activeInterns}
            trend={{
              direction: stats.activeInterns > 0 ? 'up' : 'stable',
              value: statsLoading
                ? 'Loading...'
                : stats.activeInterns > 0
                  ? `${stats.activeInterns} currently active`
                  : 'No active interns',
            }}
            icon={<GraduationCap className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Reviews Due"
            value={statsLoading ? '—' : stats.performanceReviews}
            trend={{
              direction: stats.performanceReviews > 0 ? 'up' : 'stable',
              value: statsLoading
                ? 'Loading...'
                : stats.performanceReviews > 0
                  ? `${stats.performanceReviews} awaiting review`
                  : 'All reviews completed',
            }}
            icon={<Target className="h-4 w-4" strokeWidth={1.5} />}
          />
        </StatCardGrid>
      </div>

      {/* Main Bento Grid */}
      <BentoGrid columns={4}>
        {/* Company Pulse Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<Calendar className="h-4 w-4" strokeWidth={1.5} />}>
              Company Pulse
            </BentoCardTitle>
            <Link href="/admin/company-pulse">
              <Button variant="ghost" size="xs">
                Manage
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </BentoCardHeader>
          <BentoCardContent>
            <CompanyPulseWidget />
          </BentoCardContent>
        </BentoCard>

        {/* Recent Activity Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<CheckCircle className="h-4 w-4" strokeWidth={1.5} />}>
              Recent Admin Activity
            </BentoCardTitle>
            <Link href="/admin/activity">
              <Button variant="ghost" size="xs">
                View All
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </BentoCardHeader>
          <BentoCardContent>
            {activityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-start gap-3">
                      {getActionIcon(activity.action)}
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {activity.action}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {activity.performedBy === 'System' ? (
                            <span className="inline-flex items-center gap-1">
                              <Settings className="h-3 w-3" strokeWidth={1.5} />
                              System
                            </span>
                          ) : (
                            activity.performedBy
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No recent activity"
                description="Recent admin actions will appear here"
              />
            )}
          </BentoCardContent>
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
