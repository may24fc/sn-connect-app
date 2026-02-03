'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Users,
  ClipboardList,
  FileText,
  Target,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  GraduationCap,
  BarChart3,
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
const stats = {
  totalEmployees: 248,
  activeInterns: 12,
  pendingLeaves: 8,
  performanceReviews: 15,
};

const pendingApprovals = [
  {
    id: '1',
    type: 'Leave Request',
    employee: 'John Smith',
    details: 'Vacation Leave - 3 days',
    date: 'Feb 5-7, 2026',
    priority: 'medium' as const,
  },
  {
    id: '2',
    type: 'Performance Review',
    employee: 'Sarah Johnson',
    details: 'Q1 2026 Review',
    date: 'Due Feb 10, 2026',
    priority: 'high' as const,
  },
  {
    id: '3',
    type: 'Leave Request',
    employee: 'Mike Davis',
    details: 'Sick Leave - 1 day',
    date: 'Feb 3, 2026',
    priority: 'urgent' as const,
  },
];

const recentActivities = [
  {
    id: '1',
    action: 'New employee onboarded',
    employee: 'Emily Chen',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    action: 'Performance review completed',
    employee: 'David Wilson',
    timestamp: '5 hours ago',
  },
  {
    id: '3',
    action: 'Leave request approved',
    employee: 'Jessica Brown',
    timestamp: '1 day ago',
  },
];

const departmentStats = [
  { name: 'Engineering', headcount: 85, openPositions: 3 },
  { name: 'Sales', headcount: 42, openPositions: 2 },
  { name: 'Marketing', headcount: 28, openPositions: 1 },
  { name: 'Operations', headcount: 35, openPositions: 0 },
];

export default function AdminDashboardPage(): ReactNode {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}. Here is your HR overview
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/employees">
            <Users className="mr-2 h-4 w-4" />
            Manage Employees
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Employees
                </p>
                <p className="text-2xl font-bold">{stats.totalEmployees}</p>
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
                  Active Interns
                </p>
                <p className="text-2xl font-bold">{stats.activeInterns}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success">
                <GraduationCap className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Leaves
                </p>
                <p className="text-2xl font-bold">{stats.pendingLeaves}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <ClipboardList className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Reviews Due
                </p>
                <p className="text-2xl font-bold">{stats.performanceReviews}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Target className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>Items requiring your attention</CardDescription>
              </div>
              <Badge variant="warning">{pendingApprovals.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      item.priority === 'urgent'
                        ? 'bg-destructive/10 text-destructive'
                        : item.priority === 'high'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.employee} - {item.details}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Review
                </Button>
              </div>
            ))}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/admin/leave-approvals">
                View All Approvals
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Department Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Department Overview
            </CardTitle>
            <CardDescription>Headcount and open positions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {departmentStats.map((dept) => (
              <div key={dept.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{dept.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {dept.headcount} employees
                    </span>
                    {dept.openPositions > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {dept.openPositions} open
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress value={(dept.headcount / 100) * 100} className="h-2" />
              </div>
            ))}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/admin/teams">
                Manage Teams
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest HR system activities</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/reports">View Reports</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start justify-between border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success mt-1">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.employee}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {activity.timestamp}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/employees">
          <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-card-hover">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">Employee Management</h3>
                <p className="text-xs text-muted-foreground">Manage workforce</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/performance">
          <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-card-hover">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                <Target className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">Performance</h3>
                <p className="text-xs text-muted-foreground">Reviews & OKRs</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/recruitment">
          <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-card-hover">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">Recruitment</h3>
                <p className="text-xs text-muted-foreground">Open positions</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/reports">
          <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-card-hover">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">Reports</h3>
                <p className="text-xs text-muted-foreground">Analytics & insights</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
