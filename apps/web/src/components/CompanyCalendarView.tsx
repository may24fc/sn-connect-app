'use client';

import { useCompanyCalendar } from '@/hooks/useCompanyPulse';
import {
  buildAddToCalendarUrl,
  formatCompanyCalendarDateLabel,
  formatCompanyCalendarTimeRange,
  getCompanyCalendarDate,
  getCompanyCalendarDayKey,
  type CompanyCalendarEvent,
} from '@/lib/company-calendar';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Skeleton,
} from '@hr-portal/ui';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

interface CompanyCalendarViewProps {
  title: string;
  description: string;
  managementHref?: string;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfCalendarGrid(date: Date): Date {
  const firstDay = startOfMonth(date);
  return new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() - firstDay.getDay());
}

function endOfCalendarGrid(date: Date): Date {
  const lastDay = endOfMonth(date);
  return new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + (6 - lastDay.getDay()), 23, 59, 59, 999);
}

function buildCalendarDays(date: Date): Array<Date> {
  const start = startOfCalendarGrid(date);
  return Array.from({ length: 42 }, (_, index) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  );
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function parseMonthParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearPart, monthPart] = value.split('-');
  if (!yearPart || !monthPart) {
    return null;
  }

  const year = Number(yearPart);
  const month = Number(monthPart);
  return new Date(year, month - 1, 1);
}

function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sortEvents(events: Array<CompanyCalendarEvent>): Array<CompanyCalendarEvent> {
  return [...events].sort(
    (left, right) =>
      getCompanyCalendarDate(left.start, left.allDay).getTime() -
      getCompanyCalendarDate(right.start, right.allDay).getTime(),
  );
}

function getNextUpcomingEvent(events: Array<CompanyCalendarEvent>): CompanyCalendarEvent | null {
  const now = Date.now();
  return (
    sortEvents(events).find(
      (event) => getCompanyCalendarDate(event.end || event.start, event.allDay).getTime() >= now,
    ) ?? null
  );
}

function DayEventPill({ event, highlighted }: { event: CompanyCalendarEvent; highlighted: boolean }): ReactNode {
  return (
    <div
      className={[
        'rounded-md px-2 py-1 text-xs border',
        highlighted
          ? 'border-slate-300 bg-slate-100 text-slate-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50'
          : 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300',
      ].join(' ')}
    >
      <p className="truncate font-medium">{event.summary}</p>
      <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
        {formatCompanyCalendarTimeRange(event.start, event.end, event.allDay)}
      </p>
    </div>
  );
}

export function CompanyCalendarView({
  title,
  description,
  managementHref,
}: CompanyCalendarViewProps): ReactNode {
  const searchParams = useSearchParams();
  const monthParam = searchParams.get('month');
  const eventIdParam = searchParams.get('eventId');
  const initialMonth = parseMonthParam(monthParam) ?? startOfMonth(new Date());

  const [viewDate, setViewDate] = useState<Date>(initialMonth);
  const [selectedDay, setSelectedDay] = useState<string>(getDateKey(new Date()));

  useEffect(() => {
    const nextMonth = parseMonthParam(monthParam);
    if (nextMonth) {
      setViewDate(nextMonth);
    }
  }, [monthParam]);

  const calendarDays = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const rangeStart = useMemo(() => startOfCalendarGrid(viewDate).toISOString(), [viewDate]);
  const rangeEnd = useMemo(() => endOfCalendarGrid(viewDate).toISOString(), [viewDate]);

  const { data, isLoading } = useCompanyCalendar({
    start: rangeStart,
    end: rangeEnd,
    limit: 150,
  });

  const events = useMemo(() => sortEvents(data?.data ?? []), [data?.data]);
  const configured = data?.configured ?? false;

  const eventsByDay = useMemo(() => {
    return events.reduce<Record<string, Array<CompanyCalendarEvent>>>((accumulator, event) => {
      const key = getCompanyCalendarDayKey(event.start, event.allDay);
      if (!accumulator[key]) {
        accumulator[key] = [];
      }

      accumulator[key].push(event);
      return accumulator;
    }, {});
  }, [events]);

  useEffect(() => {
    if (eventIdParam) {
      const selectedEvent = events.find((event) => event.id === eventIdParam);
      if (selectedEvent) {
        setSelectedDay(getCompanyCalendarDayKey(selectedEvent.start, selectedEvent.allDay));
        return;
      }
    }

    const daysInView = new Set(calendarDays.map((day) => getDateKey(day)));
    if (daysInView.has(selectedDay)) {
      return;
    }

    const todayKey = getDateKey(new Date());
    if (daysInView.has(todayKey)) {
      setSelectedDay(todayKey);
      return;
    }

    setSelectedDay(getDateKey(startOfMonth(viewDate)));
  }, [calendarDays, eventIdParam, events, selectedDay, viewDate]);

  const selectedDayEvents = sortEvents(eventsByDay[selectedDay] ?? []);
  const nextUpcomingEvent = getNextUpcomingEvent(events);
  const currentMonthCount = events.filter((event) => {
    const eventDate = getCompanyCalendarDate(event.start, event.allDay);
    return (
      eventDate.getFullYear() === viewDate.getFullYear() &&
      eventDate.getMonth() === viewDate.getMonth()
    );
  }).length;
  const allDayCount = events.filter((event) => event.allDay).length;

  return (
    <div className="h-full space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {managementHref ? (
            <Button asChild variant="outline" size="sm">
              <Link href={managementHref}>Manage Source</Link>
            </Button>
          ) : null}
          <Button asChild size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
            <a href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Open Google Calendar
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border border-border bg-card xl:col-span-2">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatMonthLabel(viewDate)}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Shared company schedule sourced from Google Calendar.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewDate(startOfMonth(new Date()))}
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!configured && !isLoading ? (
              <EmptyState
                icon={Calendar}
                title="Calendar not configured"
                description={managementHref
                  ? 'Connect the Google Calendar source before this page can render the shared company schedule.'
                  : 'The shared company calendar is not configured yet. Contact an administrator to enable it.'}
              />
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[840px] space-y-2">
                  <div className="grid grid-cols-7 gap-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="px-2 py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day) => {
                      const dayKey = getDateKey(day);
                      const dayEvents = sortEvents(eventsByDay[dayKey] ?? []);
                      const inCurrentMonth = day.getMonth() === viewDate.getMonth();
                      const isSelected = selectedDay === dayKey;
                      const isToday = dayKey === getDateKey(new Date());

                      return (
                        <button
                          key={dayKey}
                          type="button"
                          onClick={() => setSelectedDay(dayKey)}
                          className={[
                            'min-h-36 rounded-xl border p-3 text-left transition-colors',
                            inCurrentMonth
                              ? 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40'
                              : 'border-zinc-200/70 bg-zinc-50 text-zinc-400 dark:border-zinc-900 dark:bg-zinc-950/20 dark:text-zinc-600',
                            isSelected
                              ? 'ring-2 ring-inset ring-slate-500/30'
                              : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={[
                                'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                                isToday
                                  ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                                  : 'text-zinc-700 dark:text-zinc-300',
                              ].join(' ')}
                            >
                              {day.getDate()}
                            </span>
                            {dayEvents.length > 0 ? <Badge variant="secondary">{dayEvents.length}</Badge> : null}
                          </div>

                          <div className="mt-3 space-y-2">
                            {dayEvents.slice(0, 3).map((event) => (
                              <DayEventPill
                                key={event.id}
                                event={event}
                                highlighted={event.id === eventIdParam}
                              />
                            ))}
                            {dayEvents.length > 3 ? (
                              <p className="px-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                +{dayEvents.length - 3} more events
                              </p>
                            ) : null}
                            {isLoading && dayEvents.length === 0 ? <Skeleton className="h-10 w-full" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <Card className="border border-border bg-card">
              <CardContent className="p-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">This Month</p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{currentMonthCount}</p>
              </CardContent>
            </Card>
            <Card className="border border-border bg-card">
              <CardContent className="p-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">All-Day Events</p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{allDayCount}</p>
              </CardContent>
            </Card>
            <Card className="border border-border bg-card">
              <CardContent className="p-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Next Event</p>
                <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {nextUpcomingEvent ? nextUpcomingEvent.summary : 'No upcoming events'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border bg-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatCompanyCalendarDateLabel(selectedDay, true)}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {selectedDayEvents.length} event{selectedDayEvents.length === 1 ? '' : 's'} scheduled
                  </p>
                </div>
                <Badge variant="secondary">Updates every 5 minutes</Badge>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="mt-2 h-3 w-1/3" />
                    </div>
                  ))}
                </div>
              ) : selectedDayEvents.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No events on this day"
                  description="Select another date in the month view to inspect the shared company schedule."
                />
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={[
                        'rounded-xl border p-4',
                        event.id === eventIdParam
                          ? 'border-slate-300 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900/70'
                          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {event.summary}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {formatCompanyCalendarTimeRange(event.start, event.end, event.allDay)}
                          </p>
                        </div>
                        {event.allDay ? <Badge variant="secondary">All day</Badge> : null}
                      </div>

                      {event.location ? (
                        <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                          <MapPin className="h-4 w-4" strokeWidth={1.5} />
                          <span>{event.location}</span>
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <a href={buildAddToCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1.5 h-4 w-4" />
                            Add to My Calendar
                          </a>
                        </Button>
                        {event.htmlLink ? (
                          <Button asChild size="sm" variant="ghost">
                            <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
                              Open Source Event
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}