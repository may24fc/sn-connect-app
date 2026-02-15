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
import { Badge, Button, Progress } from '@hr-portal/ui';
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

// Mock data - replace with actual data fetching
const onboardingProgress = 75;
const probationData = {
  stage: 'Stage 2',
  daysRemaining: 45,
  status: 'on-track' as const,
};

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

const announcements = [
  {
    id: '1',
    title: 'Company Holiday Schedule 2026',
    date: '2 hours ago',
    category: 'HR Updates',
  },
  {
    id: '2',
    title: 'New Health Benefits Package',
    date: '1 day ago',
    category: 'Benefits',
  },
  {
    id: '3',
    title: 'Q1 Town Hall Meeting',
    date: '2 days ago',
    category: 'Events',
  },
];

const upcomingEvents = [
  { title: 'Performance Review', date: 'Feb 15, 2026', time: '2:00 PM' },
  { title: 'Team Building', date: 'Feb 20, 2026', time: '10:00 AM' },
  { title: 'Training Workshop', date: 'Feb 25, 2026', time: '9:00 AM' },
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
        <Button asChild>
          <Link href="/files">
            <FolderOpen className="mr-2 h-4 w-4" strokeWidth={1.5} />
            View My Files
          </Link>
        </Button>
      </div>

      {/* Stats Row */}
      <StatCardGrid columns={4}>
        <StatCard
          label="Onboarding"
          value={`${onboardingProgress}%`}
          trend={{ direction: 'up', value: '+15% this week' }}
          icon={<Target className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Probation"
          value={probationData.stage}
          trend={{ direction: 'stable', value: `${probationData.daysRemaining} days left` }}
          icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Tasks Due"
          value="3"
          trend={{ direction: 'down', value: '2 completed' }}
          icon={<ClipboardCheck className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Notifications"
          value="5"
          trend={{ direction: 'up', value: '2 new' }}
          icon={<Bell className="h-4 w-4" strokeWidth={1.5} />}
        />
      </StatCardGrid>

      {/* Main Bento Grid */}
      <BentoGrid columns={4}>
        {/* Quick Actions Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<Target className="h-4 w-4" strokeWidth={1.5} />}>
              Quick Actions
            </BentoCardTitle>
          </BentoCardHeader>
          <BentoCardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <action.icon className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
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
            <Badge variant={probationData.status === 'on-track' ? 'success' : 'warning'}>
              {probationData.status === 'on-track' ? 'On Track' : 'At Risk'}
            </Badge>
          </BentoCardHeader>
          <BentoCardContent>
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
                <span className="text-sm text-zinc-500 dark:text-zinc-400">3 tasks remaining</span>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  View checklist
                  <ChevronRight className="ml-1 h-4 w-4" strokeWidth={1.5} />
                </Link>
              </div>
            </div>
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
            <div className="space-y-3">
              {upcomingEvents.map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-zinc-400 flex-shrink-0" strokeWidth={1.5} />
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
          </BentoCardContent>
        </BentoCard>

        {/* Announcements Card */}
        <BentoCard colSpan={2}>
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
                    className="h-4 w-4 text-zinc-400 flex-shrink-0 mt-1"
                    strokeWidth={1.5}
                  />
                </div>
              ))}
            </div>
          </BentoCardContent>
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
