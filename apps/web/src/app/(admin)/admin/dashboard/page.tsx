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
import { useMilestones } from '@/hooks/useMilestones';
import { Badge, Button, MilestoneFeed, Progress } from '@hr-portal/ui';
import {
  BarChart3,
  Cake,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  FileText,
  GraduationCap,
  Target,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

// Quick actions configuration
const quickActions = [
  {
    title: 'Employee Management',
    description: 'Manage workforce',
    icon: Users,
    href: '/admin/employees',
  },
  {
    title: 'Performance',
    description: 'Reviews & OKRs',
    icon: Target,
    href: '/admin/performance',
  },
  {
    title: 'Recruitment',
    description: 'Open positions',
    icon: GraduationCap,
    href: '/admin/recruitment',
  },
  {
    title: 'Reports',
    description: 'Analytics & insights',
    icon: FileText,
    href: '/admin/reports',
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function AdminDashboardPage(): ReactNode {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'Admin';
  const greeting = getGreeting();

  const { data: milestonesData, isLoading: milestonesLoading } = useMilestones({ days: 30 });

  // Data would come from API hooks - showing UI structure without data
  const stats = {
    totalEmployees: 0,
    activeInterns: 0,
    performanceReviews: 0,
  };
  const recentActivities: Array<{
    id: string;
    action: string;
    employee: string;
    timestamp: string;
  }> = [];
  const departmentStats: Array<{ name: string; headcount: number; openPositions: number }> = [];

  return (
    <div className="h-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Here is your HR overview for today.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/employees">
            <Users className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Manage Employees
          </Link>
        </Button>
      </div>

      {/* Stats Row */}
      <StatCardGrid columns={3}>
        <StatCard
          label="Total Employees"
          value={stats.totalEmployees}
          trend={{ direction: 'stable', value: 'No data available' }}
          icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Active Interns"
          value={stats.activeInterns}
          trend={{ direction: 'stable', value: 'No data available' }}
          icon={<GraduationCap className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Reviews Due"
          value={stats.performanceReviews}
          trend={{ direction: 'stable', value: 'No data available' }}
          icon={<Target className="h-4 w-4" strokeWidth={1.5} />}
        />
      </StatCardGrid>

      {/* Main Bento Grid */}
      <BentoGrid columns={4}>
        {/* Department Overview Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<BarChart3 className="h-4 w-4" strokeWidth={1.5} />}>
              Department Overview
            </BentoCardTitle>
            <Link href="/admin/teams">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                Manage
              </Button>
            </Link>
          </BentoCardHeader>
          <BentoCardContent>
            {departmentStats.length > 0 ? (
              <div className="space-y-4">
                {departmentStats.map((dept) => (
                  <div key={dept.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {dept.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {dept.headcount} employees
                        </span>
                        {dept.openPositions > 0 && (
                          <Badge variant="secondary" className="text-xs h-5">
                            {dept.openPositions} open
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress value={(dept.headcount / 100) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No department data"
                description="Department statistics will appear here once data is available"
                action={{ label: 'Manage Departments', href: '/admin/teams' }}
              />
            )}
          </BentoCardContent>
        </BentoCard>

        {/* Recent Activity Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<CheckCircle className="h-4 w-4" strokeWidth={1.5} />}>
              Recent Activity
            </BentoCardTitle>
            <Link href="/admin/reports">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                View All
              </Button>
            </Link>
          </BentoCardHeader>
          <BentoCardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle
                        className="h-4 w-4 text-zinc-400 flex-shrink-0 mt-0.5"
                        strokeWidth={1.5}
                      />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {activity.action}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {activity.employee}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                      {activity.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No recent activity"
                description="Recent HR activities will appear here"
              />
            )}
          </BentoCardContent>
        </BentoCard>

        {/* Milestones - Birthdays & Anniversaries */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<Cake className="h-4 w-4" strokeWidth={1.5} />}>
              Upcoming Milestones
            </BentoCardTitle>
          </BentoCardHeader>
          <BentoCardContent>
            <MilestoneFeed
              milestones={milestonesData?.milestones || []}
              grouped={milestonesData?.grouped}
              isLoading={milestonesLoading}
              maxItems={6}
              compact
            />
          </BentoCardContent>
        </BentoCard>

        {/* Quick Actions Card */}
        <BentoCard colSpan={4}>
          <BentoCardHeader>
            <BentoCardTitle icon={<Target className="h-4 w-4" strokeWidth={1.5} />}>
              Quick Actions
            </BentoCardTitle>
          </BentoCardHeader>
          <BentoCardContent>
            <div className="grid grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <action.icon
                      className="h-4 w-4 text-zinc-400 flex-shrink-0"
                      strokeWidth={1.5}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {action.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {action.description}
                      </p>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 text-zinc-400 flex-shrink-0"
                      strokeWidth={1.5}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </BentoCardContent>
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
