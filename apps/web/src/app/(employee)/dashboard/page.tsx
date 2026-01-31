'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  ClipboardCheck,
  FileText,
  Bell,
  ChevronRight,
  Target,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Badge,
  Button,
} from '@hr-portal/ui';

// Mock data - replace with actual data fetching
const onboardingProgress = 75;
const probationData = {
  stage: 'Stage 2',
  daysRemaining: 45,
  status: 'on-track' as const,
};

const actionCards = [
  {
    title: 'Upload Documents',
    description: '2 documents pending',
    icon: FolderOpen,
    href: '/files',
    variant: 'warning' as const,
  },
  {
    title: 'Complete Checklist',
    description: '3 tasks remaining',
    icon: ClipboardCheck,
    href: '/onboarding',
    variant: 'default' as const,
  },
  {
    title: 'Submit Invoice',
    description: 'Due in 5 days',
    icon: FileText,
    href: '/payroll',
    variant: 'default' as const,
  },
];

const announcements = [
  {
    id: '1',
    title: 'Company Holiday Schedule 2024',
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
    title: 'Q4 Town Hall Meeting',
    date: '2 days ago',
    category: 'Events',
  },
];

const upcomingEvents = [
  { title: 'Performance Review', date: 'Jan 15, 2024', time: '2:00 PM' },
  { title: 'Team Building', date: 'Jan 20, 2024', time: '10:00 AM' },
];

export default function DashboardPage(): ReactNode {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, John!
          </h1>
          <p className="text-muted-foreground">
            Here is what is happening with your HR journey today.
          </p>
        </div>
        <Button asChild>
          <Link href="/files">
            <FolderOpen className="mr-2 h-4 w-4" />
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
              <Target className="h-5 w-5 text-primary" />
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
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Probation Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-success" />
              Probation Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{probationData.stage}</span>
                <Badge
                  variant={
                    probationData.status === 'on-track' ? 'success' : 'warning'
                  }
                >
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
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingEvents.map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{event.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {event.date}
                  </span>
                </div>
              ))}
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
              <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-card-hover">
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                      card.variant === 'warning'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    <card.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Announcements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
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
            {announcements.map((announcement) => (
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
