'use client';

import { CompanyPulseWidget } from '@/components/CompanyPulseWidget';
import { useCompanyPulse } from '@/hooks/useCompanyPulse';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Separator,
} from '@hr-portal/ui';
import { Calendar, CheckCircle2, ExternalLink, RefreshCcw, Settings2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

export default function AdminCompanyPulsePage() {
  const { data, isLoading, error } = useCompanyPulse();
  const events = data?.data ?? [];
  const configured = data?.configured ?? false;
  const hasRouteError = Boolean(data?.error) || Boolean(error);

  const stats = useMemo(() => {
    const now = Date.now();
    const total = events.length;
    const allDay = events.filter((event) => event.allDay).length;
    const upcomingThisWeek = events.filter((event) => {
      const eventTime = new Date(event.start).getTime();
      return eventTime >= now && eventTime <= now + 7 * 24 * 60 * 60 * 1000;
    }).length;

    return { total, allDay, upcomingThisWeek };
  }, [events]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="p-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Company Calendar</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Google Calendar is the single source of truth. The HR portal reads one shared company calendar and reflects those events on every dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/dashboard">Back to Dashboard</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/calendar">Open Calendar View</Link>
            </Button>
            <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white">
              <a href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Open Google Calendar
              </a>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Upcoming Events', value: stats.total },
            { label: 'This Week', value: stats.upcomingThisWeek },
            { label: 'All-Day Events', value: stats.allDay },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border border-border rounded-lg p-4">
              <CardContent className="p-0">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{stat.label}</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="bg-card border border-border rounded-lg xl:col-span-2">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Connection Status</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    The portal reads one shared calendar and refreshes every 5 minutes.
                  </p>
                </div>
                <Badge variant={configured && !hasRouteError ? 'success' : 'warning'}>
                  {configured && !hasRouteError ? 'Connected' : 'Needs setup'}
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    How it works
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Admins create and edit events directly in the shared Google Calendar. Company Calendar then shows the next upcoming items across employee, admin, intern, and super-admin dashboards.
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    Required environment
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Configure <span className="font-mono">GOOGLE_CALENDAR_ID</span>, <span className="font-mono">GOOGLE_SERVICE_ACCOUNT_EMAIL</span>, and <span className="font-mono">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</span> in the web app environment.
                  </p>
                </div>
              </div>

              {hasRouteError && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Calendar fetch warning</p>
                  <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                    {data?.error ?? 'The Google Calendar API request failed. Confirm the service account has access to the calendar and that the private key is valid.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border border-border rounded-lg">
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Admin workflow</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Keep all event authoring in Google Calendar.
                </p>
              </div>

              <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                <div className="flex gap-3">
                  <Settings2 className="h-4 w-4 mt-0.5 text-zinc-500" />
                  <span>Create one shared company calendar dedicated to dashboard events.</span>
                </div>
                <div className="flex gap-3">
                  <ShieldCheck className="h-4 w-4 mt-0.5 text-zinc-500" />
                  <span>Grant the service account read access to that calendar.</span>
                </div>
                <div className="flex gap-3">
                  <Calendar className="h-4 w-4 mt-0.5 text-zinc-500" />
                  <span>Add, update, and cancel events only in Google Calendar.</span>
                </div>
                <div className="flex gap-3">
                  <RefreshCcw className="h-4 w-4 mt-0.5 text-zinc-500" />
                  <span>Wait up to 5 minutes for the widget cache to refresh.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <Card className="bg-card border border-border rounded-lg p-8">
            <CardContent className="p-0 text-sm text-zinc-600 dark:text-zinc-400 text-center">
              Loading calendar status...
            </CardContent>
          </Card>
        ) : !configured ? (
          <EmptyState
            icon={Calendar}
            title="Google Calendar not configured"
            description="Set the required Google calendar environment variables and share the calendar with the service account. Company Calendar will stay empty until that connection is live."
            action={{
              label: 'Open Google Calendar',
              onClick: () => window.open('https://calendar.google.com/calendar/u/0/r', '_blank', 'noopener,noreferrer'),
            }}
          />
        ) : (
          <Card className="bg-card border border-border rounded-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Live preview</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    This is the same Company Calendar feed shown on the dashboards.
                  </p>
                </div>
                <Badge variant="secondary">Read-only preview</Badge>
              </div>

              <CompanyPulseWidget scrollable={false} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}