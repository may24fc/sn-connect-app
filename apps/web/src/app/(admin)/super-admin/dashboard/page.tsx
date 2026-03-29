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
import { CompanyPulseWidget } from '@/components/CompanyPulseWidget';
import { useDashboardAttentionItems } from '@/hooks/useDashboardAttentionItems';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { useSuperAdminStats } from '@/hooks/useSuperAdminStats';
import {
  Badge,
  Button,
  ComingSoonDialog,
  DashboardAttentionCarousel,
  EmptyState,
  Progress,
} from '@hr-portal/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Calendar,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Database,
  Edit,
  FileText,
  Loader2,
  Plus,
  Settings,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

export default function SuperAdminDashboardPage(): ReactNode {
  const { user } = useAuth();
  const router = useRouter();
  const firstName = user?.name?.split(' ')[0] ?? 'Admin';
  const greeting = getGreeting();
  const { data: statsData, isLoading } = useSuperAdminStats();
  const {
    items: attentionItems,
    isLoading: attentionLoading,
    totalCount: attentionCount,
  } = useDashboardAttentionItems('super_admin');
  const { data: activityData, isLoading: activityLoading } = useRecentActivity(8, {
    scope: 'super_admin',
  });
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState<string | undefined>();

  const openComingSoon = (featureName: string): void => {
    setComingSoonFeature(featureName);
    setComingSoonOpen(true);
  };

  const systemStats = {
    totalUsers: statsData?.totalUsers ?? 0,
    activeUsers: statsData?.activeUsers ?? 0,
    auditLogs: statsData?.auditLogsCount ?? 0,
  };
  const userRoleDistribution = statsData?.userRoleDistribution ?? [];
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
            Complete system overview and control.
          </p>
        </div>
        <Button onClick={() => openComingSoon('System Settings')}>
            <Settings className="mr-2 h-4 w-4" strokeWidth={1.5} />
            System Settings
        </Button>
      </div>

      <DashboardAttentionCarousel
        items={attentionItems}
        isLoading={attentionLoading}
        totalCount={attentionCount}
        onNavigate={(path) => router.push(path)}
      />

      {/* Stats Row */}
      <div data-tour="stat-cards">
        <StatCardGrid columns={4}>
          <StatCard
            label="Total Users"
            value={isLoading ? '—' : systemStats.totalUsers}
            trend={{
              direction: systemStats.activeUsers > 0 ? 'up' : 'stable',
              value: isLoading ? 'Loading...' : `${systemStats.activeUsers} active`,
            }}
            icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="System Uptime"
            value="—"
            trend={{ direction: 'stable', value: 'Monitoring not configured' }}
            icon={<Activity className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Security Alerts"
            value="—"
            trend={{ direction: 'stable', value: 'Alerting not configured' }}
            icon={<Shield className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Audit Logs"
            value={isLoading ? '—' : systemStats.auditLogs}
            trend={{
              direction: systemStats.auditLogs > 0 ? 'up' : 'stable',
              value: isLoading ? 'Loading...' : 'This month',
            }}
            icon={<FileText className="h-4 w-4" strokeWidth={1.5} />}
          />
        </StatCardGrid>
      </div>

      {/* Main Bento Grid */}
      <BentoGrid columns={4}>
        {/* Security Alerts Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<Shield className="h-4 w-4" strokeWidth={1.5} />}>
              Security Alerts
            </BentoCardTitle>
            <Badge variant="secondary">Not connected</Badge>
          </BentoCardHeader>
          <BentoCardContent>
            <EmptyState
              icon={Shield}
              title="Alert monitoring is not connected"
              description="Connect an alerting source before this dashboard can surface live security incidents."
              action={{
                label: 'Configure alerting',
                onClick: () => openComingSoon('Alert Monitoring'),
              }}
              size="sm"
            />
          </BentoCardContent>
        </BentoCard>

        {/* System Health Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<Database className="h-4 w-4" strokeWidth={1.5} />}>
              System Health
            </BentoCardTitle>
            <Badge variant="secondary">Not connected</Badge>
          </BentoCardHeader>
          <BentoCardContent>
            <EmptyState
              icon={Database}
              title="System monitoring is not connected"
              description="Connect uptime and service-health signals before this dashboard can report platform status."
              action={{
                label: 'Configure monitoring',
                onClick: () => openComingSoon('System Monitoring'),
              }}
              size="sm"
            />
          </BentoCardContent>
        </BentoCard>

        {/* User Role Distribution */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<Users className="h-4 w-4" strokeWidth={1.5} />}>
              User Role Distribution
            </BentoCardTitle>
          </BentoCardHeader>
          <BentoCardContent>
            <div className="space-y-4">
              {userRoleDistribution.length > 0 ? (
                userRoleDistribution.map((roleData) => (
                  <div key={roleData.role} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {roleData.role}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {roleData.count} users
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {roleData.percentage}%
                        </span>
                      </div>
                    </div>
                    <Progress value={roleData.percentage} className="h-1.5" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 text-center py-4">
                  No role distribution data available
                </p>
              )}
            </div>
          </BentoCardContent>
        </BentoCard>

        {/* Company Pulse Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<Calendar className="h-4 w-4" strokeWidth={1.5} />}>
              Company Pulse
            </BentoCardTitle>
            <Link href="/super-admin/company-pulse">
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

        {/* Recent Activity */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<CheckCircle className="h-4 w-4" strokeWidth={1.5} />}>
              Recent Super Admin Activity
            </BentoCardTitle>
            <Link href="/super-admin/activity">
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
                description="Recent super-admin and system actions will appear here as activity is recorded."
                size="sm"
              />
            )}
          </BentoCardContent>
        </BentoCard>
      </BentoGrid>

      <ComingSoonDialog
        open={comingSoonOpen}
        onOpenChange={setComingSoonOpen}
        featureName={comingSoonFeature}
      />
    </div>
  );
}
