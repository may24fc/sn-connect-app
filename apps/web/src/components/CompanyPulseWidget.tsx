'use client';

import { useCompanyPulse, type PulseEvent } from '@/hooks/useCompanyPulse';
import { Badge, Skeleton } from '@hr-portal/ui';
import { Calendar, ExternalLink, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';

// ─── Helpers ────────────────────────────────────────

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

function dateBadge(iso: string): { month: string; day: number } {
  const d = new Date(iso);
  return { month: MONTHS[d.getMonth()] ?? 'JAN', day: d.getDate() };
}

function formatTimeRange(start: string, end: string, allDay: boolean): string {
  if (allDay) return 'All day';
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function buildAddToCalendarUrl(event: PulseEvent): string {
  const params = new URLSearchParams({ action: 'TEMPLATE' });
  params.set('text', event.summary);
  if (event.location) params.set('location', event.location);

  const fmtDate = (iso: string, allDay: boolean) => {
    if (allDay) return iso.slice(0, 10).replace(/-/g, '');
    return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  if (event.start) {
    params.set(
      'dates',
      `${fmtDate(event.start, event.allDay)}/${fmtDate(event.end || event.start, event.allDay)}`,
    );
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ─── Item ───────────────────────────────────────────

function PulseItem({ event }: { event: PulseEvent }): ReactNode {
  const { month, day } = dateBadge(event.start);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 transition-colors">
      {/* Date badge */}
      <div className="flex flex-col items-center justify-center w-11 h-11 rounded-lg bg-zinc-100 dark:bg-zinc-800/40 flex-shrink-0">
        <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-400 leading-none">
          {month}
        </span>
        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-300 leading-tight">
          {day}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
          {event.summary}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatTimeRange(event.start, event.end, event.allDay)}
        </p>
        {event.location && (
          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
      </div>

      {/* Add to my calendar */}
      <a
        href={buildAddToCalendarUrl(event)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 p-1.5 rounded-md text-zinc-400 hover:text-slate-700 dark:hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
        title="Add to my Google Calendar"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

// ─── Widget ─────────────────────────────────────────

export function CompanyPulseWidget(): ReactNode {
  const { data, isLoading } = useCompanyPulse();

  const events = data?.data ?? [];
  const configured = data?.configured ?? false;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <Skeleton className="h-11 w-11 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Calendar className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-3" strokeWidth={1.5} />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Calendar not configured
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-[200px]">
          Contact your administrator to connect the company calendar.
        </p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Calendar className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-3" strokeWidth={1.5} />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          No upcoming company events
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          Events will appear here when scheduled.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <PulseItem key={event.id} event={event} />
      ))}
      <div className="pt-1 flex justify-end">
        <Badge variant="secondary" className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
          Updates every 5 minutes
        </Badge>
      </div>
    </div>
  );
}
