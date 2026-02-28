'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  TaskCard,
} from '@hr-portal/ui';
import type { Task } from '@hr-portal/ui';
import {
  Bell,
  Calendar,
  CheckSquare,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Target,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

// TODO: Replace with actual data fetching
const onboardingProgress = 0;
const probationData = {
  stage: '—',
  daysRemaining: 0,
  status: 'on-track' as const,
};

const actionCards = [
  {
    title: 'Upload Documents',
    description: 'Upload your documents',
    icon: FolderOpen,
    href: '/files',
    variant: 'default' as const,
  },
  {
    title: 'Complete Checklist',
    description: 'View onboarding checklist',
    icon: ClipboardCheck,
    href: '/onboarding',
    variant: 'default' as const,
  },
  {
    title: 'Submit Invoice',
    description: 'Go to invoice',
    icon: FileText,
    href: '/invoice',
    variant: 'default' as const,
  },
];

const announcements: Array<{
  id: string;
  title: string;
  date: string;
  category: string;
}> = [];

const upcomingEvents: Array<{
  title: string;
  date: string;
  time: string;
}> = [];

// TODO: Replace with actual data fetching
const recentTasks: Array<Task> = [];

export default function EmployeeDashboard(): ReactNode {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground">
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

      {/* Progress Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Onboarding Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
              Onboarding Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall completion</span>
                <span className="font-semibold">{onboardingProgress}%</span>
              </div>
              <Progress value={onboardingProgress} className="h-2" />
              <Link
                href="/onboarding"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                View checklist
                <ChevronRight className="ml-1 h-4 w-4" strokeWidth={1.5} />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Probation Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
              Probation Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{probationData.stage}</span>
                <Badge variant={probationData.status === 'on-track' ? 'success' : 'warning'}>
                  {probationData.status === 'on-track' ? 'On Track' : 'At Risk'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {probationData.daysRemaining} days remaining
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-muted-foreground text-xs">{event.date}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No upcoming events</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actionCards.map((card) => (
            <Link key={card.title} href={card.href}>
              <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-card-hover">
                <CardContent className="flex items-center gap-4 p-4">
                  <card.icon
                    className="h-4 w-4 text-zinc-500 dark:text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                    strokeWidth={1.5}
                  />
                  <div className="flex-1">
                    <h3 className="font-medium">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 text-zinc-500 dark:text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                    strokeWidth={1.5}
                  />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Assigned Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
              Assigned Tasks
            </CardTitle>
            <CardDescription>Tasks requiring your attention</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/tasks">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentTasks.length > 0 ? (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  variant="compact"
                  onViewDetails={() => (window.location.href = `/tasks/${task.id}`)}
                  showAssignees={false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare
                className="h-5 w-5 mx-auto mb-3 text-zinc-500 dark:text-zinc-400"
                strokeWidth={1.5}
              />
              <p>No tasks assigned yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Announcements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
              Latest Announcements
            </CardTitle>
            <CardDescription>Stay updated with company news</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/announcements">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {announcements.length > 0 ? (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="flex items-start justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <h4 className="font-medium">{announcement.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {announcement.category}
                      </Badge>
                      <span>{announcement.date}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Read
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell
                  className="h-5 w-5 mx-auto mb-3 text-zinc-500 dark:text-zinc-400"
                  strokeWidth={1.5}
                />
                <p>No announcements yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
