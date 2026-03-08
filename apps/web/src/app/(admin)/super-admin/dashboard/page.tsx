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
import { useSuperAdminStats } from '@/hooks/useSuperAdminStats';
import { Badge, Button, Progress } from '@hr-portal/ui';
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Database,
  FileText,
  Lock,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

// Security alerts remain placeholder until an alerting system is implemented
const securityAlerts: Array<{
  id: string;
  type: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
}> = [];

// System health remains placeholder until monitoring is implemented
const systemHealth: Array<{
  component: string;
  status: 'healthy' | 'degraded';
  uptime: number;
}> = [];

const quickActions = [
  {
    title: 'User Management',
    description: 'Manage all users',
    icon: Users,
    href: '/super-admin/users',
  },
  {
    title: 'Role Management',
    description: 'Configure roles',
    icon: Shield,
    href: '/super-admin/roles',
  },
  {
    title: 'Audit Logs',
    description: 'View all logs',
    icon: FileText,
    href: '/super-admin/audit-logs',
  },
  {
    title: 'System Settings',
    description: 'Configure system',
    icon: Settings,
    href: '/super-admin/settings',
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function SuperAdminDashboardPage(): ReactNode {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'Admin';
  const greeting = getGreeting();
  const { data: statsData, isLoading } = useSuperAdminStats();

  const systemStats = {
    totalUsers: statsData?.totalUsers ?? 0,
    activeUsers: statsData?.activeUsers ?? 0,
    auditLogs: statsData?.auditLogsCount ?? 0,
  };
  const userRoleDistribution = statsData?.userRoleDistribution ?? [];
  const recentAuditLogs = statsData?.recentAuditLogs ?? [];

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
        <Button asChild>
          <Link href="/super-admin/settings">
            <Settings className="mr-2 h-4 w-4" strokeWidth={1.5} />
            System Settings
          </Link>
        </Button>
      </div>

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
            value={securityAlerts.length}
            trend={{ direction: 'stable', value: 'No alerts configured' }}
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
            <Badge variant="warning">{securityAlerts.length}</Badge>
          </BentoCardHeader>
          <BentoCardContent>
            <div className="space-y-3">
              {securityAlerts.length > 0 ? (
                securityAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                          alert.severity === 'high'
                            ? 'text-rose-500'
                            : alert.severity === 'medium'
                              ? 'text-amber-500'
                              : 'text-muted-foreground'
                        }`}
                        strokeWidth={1.5}
                      />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {alert.type}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {alert.description}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 mt-0.5">
                          {alert.timestamp}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        alert.severity === 'high'
                          ? 'destructive'
                          : alert.severity === 'medium'
                            ? 'warning'
                            : 'secondary'
                      }
                      className="text-xs h-5 flex-shrink-0"
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 text-center py-4">
                  No security alerts
                </p>
              )}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/super-admin/audit-logs">
                  View All Alerts
                  <ChevronRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
                </Link>
              </Button>
            </div>
          </BentoCardContent>
        </BentoCard>

        {/* System Health Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<Database className="h-4 w-4" strokeWidth={1.5} />}>
              System Health
            </BentoCardTitle>
            <Link href="/super-admin/settings">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                Settings
              </Button>
            </Link>
          </BentoCardHeader>
          <BentoCardContent>
            <div className="space-y-4">
              {systemHealth.length > 0 ? (
                systemHealth.map((component) => (
                  <div key={component.component} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {component.component}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {component.uptime}% uptime
                        </span>
                        <Badge
                          variant={component.status === 'healthy' ? 'success' : 'warning'}
                          className="text-xs h-5"
                        >
                          {component.status}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={component.uptime} className="h-1.5" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 text-center py-4">
                  No system health data available
                </p>
              )}
            </div>
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

        {/* Recent Audit Logs */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<Lock className="h-4 w-4" strokeWidth={1.5} />}>
              Recent Audit Logs
            </BentoCardTitle>
            <Link href="/super-admin/audit-logs">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                View All
              </Button>
            </Link>
          </BentoCardHeader>
          <BentoCardContent>
            <div className="space-y-3">
              {recentAuditLogs.length > 0 ? (
                recentAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-start gap-3">
                      <Lock
                        className="h-4 w-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0 mt-0.5"
                        strokeWidth={1.5}
                      />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {log.action}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {log.details ? `${log.details} • ` : ''}{new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 text-center py-4">
                  No recent audit logs
                </p>
              )}
            </div>
          </BentoCardContent>
        </BentoCard>
      </BentoGrid>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-4 gap-4" data-tour="quick-actions">
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href}>
            <div
              className="group flex items-center gap-3 p-4 rounded-lg bg-card border border-border hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer"
              style={{ boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)' }}
            >
              <action.icon
                className="h-4 w-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                strokeWidth={1.5}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {action.title}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{action.description}</p>
              </div>
              <ChevronRight
                className="h-4 w-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                strokeWidth={1.5}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
