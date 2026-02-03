'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Users,
  Shield,
  FileText,
  Settings,
  TrendingUp,
  ChevronRight,
  Activity,
  Database,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Progress,
} from '@hr-portal/ui';
import { useAuth } from '@/contexts/AuthContext';

// Mock data
const systemStats = {
  totalUsers: 260,
  activeUsers: 248,
  systemUptime: 99.8,
  auditLogs: 1247,
};

const securityAlerts = [
  {
    id: '1',
    type: 'Login Attempt',
    description: 'Multiple failed login attempts detected',
    severity: 'high' as const,
    timestamp: '10 minutes ago',
  },
  {
    id: '2',
    type: 'Permission Change',
    description: 'User role updated: John Smith to Admin',
    severity: 'medium' as const,
    timestamp: '2 hours ago',
  },
  {
    id: '3',
    type: 'Data Access',
    description: 'Sensitive data accessed by Finance team',
    severity: 'low' as const,
    timestamp: '5 hours ago',
  },
];

const userRoleDistribution = [
  { role: 'Employees', count: 220, percentage: 84.6 },
  { role: 'Admins', count: 15, percentage: 5.8 },
  { role: 'Interns', count: 12, percentage: 4.6 },
  { role: 'Super Admins', count: 3, percentage: 1.2 },
];

const recentAuditLogs = [
  {
    id: '1',
    user: 'Admin User',
    action: 'Created new user account',
    details: 'emily.chen@company.com',
    timestamp: '1 hour ago',
  },
  {
    id: '2',
    user: 'Super Admin',
    action: 'Updated system settings',
    details: 'Changed password policy',
    timestamp: '3 hours ago',
  },
  {
    id: '3',
    user: 'Admin User',
    action: 'Approved performance review',
    details: 'Employee: David Wilson',
    timestamp: '5 hours ago',
  },
];

const systemHealth = [
  { component: 'Database', status: 'healthy', uptime: 99.9 },
  { component: 'API Services', status: 'healthy', uptime: 99.8 },
  { component: 'Authentication', status: 'healthy', uptime: 100 },
  { component: 'File Storage', status: 'degraded', uptime: 98.5 },
];

export default function SuperAdminDashboardPage(): ReactNode {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}. Complete system overview and control
          </p>
        </div>
        <Button asChild>
          <Link href="/super-admin/settings">
            <Settings className="mr-2 h-4 w-4" />
            System Settings
          </Link>
        </Button>
      </div>

      {/* System Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Users
                </p>
                <p className="text-2xl font-bold">{systemStats.totalUsers}</p>
                <p className="text-xs text-success mt-1">
                  {systemStats.activeUsers} active
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  System Uptime
                </p>
                <p className="text-2xl font-bold">{systemStats.systemUptime}%</p>
                <p className="text-xs text-success mt-1">Last 30 days</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success">
                <Activity className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Security Alerts
                </p>
                <p className="text-2xl font-bold">{securityAlerts.length}</p>
                <p className="text-xs text-warning mt-1">Requires attention</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <Shield className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Audit Logs
                </p>
                <p className="text-2xl font-bold">{systemStats.auditLogs}</p>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Security Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Alerts
                </CardTitle>
                <CardDescription>Recent security events</CardDescription>
              </div>
              <Badge variant="warning">{securityAlerts.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {securityAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg mt-0.5 ${
                      alert.severity === 'high'
                        ? 'bg-destructive/10 text-destructive'
                        : alert.severity === 'medium'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{alert.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
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
                  className="text-xs"
                >
                  {alert.severity}
                </Badge>
              </div>
            ))}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/super-admin/audit-logs">
                View All Alerts
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>Component status and uptime</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemHealth.map((component) => (
              <div key={component.component} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{component.component}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {component.uptime}% uptime
                    </span>
                    <Badge
                      variant={
                        component.status === 'healthy' ? 'success' : 'warning'
                      }
                      className="text-xs"
                    >
                      {component.status}
                    </Badge>
                  </div>
                </div>
                <Progress value={component.uptime} className="h-2" />
              </div>
            ))}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/super-admin/settings">
                System Settings
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* User Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Role Distribution
          </CardTitle>
          <CardDescription>Breakdown of users by role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userRoleDistribution.map((roleData) => (
              <div key={roleData.role} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{roleData.role}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {roleData.count} users
                    </span>
                    <span className="font-semibold">{roleData.percentage}%</span>
                  </div>
                </div>
                <Progress value={roleData.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Audit Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Audit Logs</CardTitle>
              <CardDescription>Latest system activity logs</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/super-admin/audit-logs">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAuditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary mt-1">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      By: {log.user} - {log.details}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/super-admin/users">
          <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-card-hover">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">User Management</h3>
                <p className="text-xs text-muted-foreground">Manage all users</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/super-admin/roles">
          <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-card-hover">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">Role Management</h3>
                <p className="text-xs text-muted-foreground">Configure roles</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/super-admin/audit-logs">
          <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-card-hover">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">Audit Logs</h3>
                <p className="text-xs text-muted-foreground">View all logs</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/super-admin/settings">
          <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-card-hover">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Settings className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">System Settings</h3>
                <p className="text-xs text-muted-foreground">Configure system</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
