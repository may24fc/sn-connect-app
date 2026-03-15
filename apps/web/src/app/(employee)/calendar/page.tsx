'use client';

import {
  useCalendarEvents,
  useCalendarAuthUrl,
  useDisconnectCalendar,
  type CalendarEvent,
} from '@/hooks/useGoogleCalendar';
import {
  useCompanyEvents,
  type CompanyEvent,
} from '@/hooks/useCompanyEvents';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  useToast,
} from '@hr-portal/ui';
import { EmptyState } from '@/components/data-display';
import {
  Calendar as CalendarIcon,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Link2Off,
  Loader2,
  MapPin,
} from 'lucide-react';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

function getMonthDates(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return { firstDay, lastDay };
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const { firstDay, lastDay } = getMonthDates(year, month);
  const startOffset = firstDay.getDay(); // 0=Sun

  // Fill leading days from previous month
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Days in current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Fill trailing days to complete last week
  while (days.length % 7 !== 0) {
    const nextDate = new Date(lastDay);
    nextDate.setDate(nextDate.getDate() + (days.length - startOffset - lastDay.getDate() + 1));
    days.push(nextDate);
  }

  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateRange(start: string | null, end: string | null, allDay: boolean): string {
  if (!start) return '';
  if (allDay) return 'All day';
  const startTime = formatTime(start);
  const endTime = end ? formatTime(end) : '';
  return endTime ? `${startTime} – ${endTime}` : startTime;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ──────────────────────────────────────────────────
// Unified event type (Google Calendar + Company Events)
// ──────────────────────────────────────────────────

interface UnifiedEvent {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string | null;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
  source: 'google' | 'company';
  category?: CompanyEvent['category'];
}

function fromGoogleEvent(e: CalendarEvent): UnifiedEvent {
  return {
    id: `g-${e.id}`,
    title: e.title,
    description: e.description,
    start: e.start ?? '',
    end: e.end,
    allDay: e.allDay,
    location: e.location,
    htmlLink: e.htmlLink,
    source: 'google',
  };
}

function fromCompanyEvent(e: CompanyEvent): UnifiedEvent {
  return {
    id: `c-${e.id}`,
    title: e.title,
    description: e.description,
    start: e.start_time,
    end: e.end_time,
    allDay: e.all_day,
    location: e.location,
    htmlLink: null,
    source: 'company',
    category: e.category,
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  holiday: 'Holiday',
  meeting: 'Meeting',
  deadline: 'Deadline',
  company: 'Company',
  team: 'Team',
  training: 'Training',
};

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  holiday: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  meeting: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  deadline: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  company: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  team: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  training: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

/** Builds a Google Calendar "Add to Calendar" template URL */
function buildGCalTemplateUrl(event: UnifiedEvent): string {
  const base = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({ action: 'TEMPLATE' });
  params.set('text', event.title);
  if (event.description) params.set('details', event.description);
  if (event.location) params.set('location', event.location);

  // Format dates: YYYYMMDDTHHMMSSZ or YYYYMMDD for all-day
  const fmtDate = (iso: string, allDay: boolean) => {
    if (allDay) return iso.slice(0, 10).replace(/-/g, '');
    return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const startStr = fmtDate(event.start, event.allDay);
  const endStr = event.end ? fmtDate(event.end, event.allDay) : startStr;
  params.set('dates', `${startStr}/${endStr}`);

  return `${base}?${params.toString()}`;
}

// ──────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────

export default function CalendarPage(): ReactNode {
  const { addToast } = useToast();
  const searchParams = useSearchParams();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  // Time range for event fetching (current month padded by 7 days each side)
  const { firstDay, lastDay } = getMonthDates(currentYear, currentMonth);
  const timeMin = new Date(firstDay.getTime() - 7 * 86400000).toISOString();
  const timeMax = new Date(lastDay.getTime() + 7 * 86400000).toISOString();

  const { data: calendarData, isLoading, refetch } = useCalendarEvents(timeMin, timeMax);
  const { data: companyData, isLoading: isCompanyLoading } = useCompanyEvents(timeMin, timeMax);
  const { refetch: fetchAuthUrl, isFetching: isAuthUrlLoading } = useCalendarAuthUrl();
  const disconnectMutation = useDisconnectCalendar();

  const isConnected = calendarData?.connected ?? false;
  const googleEvents = calendarData?.data ?? [];
  const companyEvents = companyData?.data ?? [];

  // Merge Google Calendar + Company Events into unified list
  const allEvents = useMemo(() => {
    const unified: UnifiedEvent[] = [];
    for (const e of googleEvents) {
      if (e.start) unified.push(fromGoogleEvent(e));
    }
    for (const e of companyEvents) {
      unified.push(fromCompanyEvent(e));
    }
    return unified.sort((a, b) => a.start.localeCompare(b.start));
  }, [googleEvents, companyEvents]);

  // Show toast for OAuth callback results
  const gcalError = searchParams.get('gcal_error');
  const gcalConnected = searchParams.get('gcal_connected');

  // Navigate months
  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(now);
  }, []);

  // Calendar grid
  const calendarDays = useMemo(() => getDaysInMonth(currentYear, currentMonth), [currentYear, currentMonth]);

  // Map events to dates
  const eventsByDate = useMemo(() => {
    const map = new Map<string, UnifiedEvent[]>();
    for (const event of allEvents) {
      if (!event.start) continue;
      const date = new Date(event.start);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const existing = map.get(key) ?? [];
      existing.push(event);
      map.set(key, existing);
    }
    return map;
  }, [allEvents]);

  const selectedDateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
  const selectedDateEvents = eventsByDate.get(selectedDateKey) ?? [];

  const handleConnect = async () => {
    const result = await fetchAuthUrl();
    if (result.data?.url) {
      window.location.href = result.data.url;
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      addToast({ title: 'Google Calendar disconnected', variant: 'success' });
      refetch();
    } catch {
      addToast({ title: 'Failed to disconnect', variant: 'error' });
    }
  };

  return (
    <div className="h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Calendar
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {isConnected
              ? 'Your Google Calendar events and company events are shown below.'
              : 'Company events are shown below. Connect Google Calendar to see personal events too.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2Off className="mr-2 h-4 w-4" />
              )}
              Disconnect Google Calendar
            </Button>
          ) : (
            <Button size="sm" onClick={handleConnect} disabled={isAuthUrlLoading}>
              {isAuthUrlLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarIcon className="mr-2 h-4 w-4" />
              )}
              Connect Google Calendar
            </Button>
          )}
        </div>
      </div>

      {/* Error/Success banners */}
      {gcalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-400">
          Failed to connect Google Calendar. Please try again.
        </div>
      )}
      {gcalConnected && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-3 text-sm text-green-700 dark:text-green-400">
          Google Calendar connected successfully!
        </div>
      )}

      {/* Calendar + Events Detail */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Calendar Grid */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={goToPrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(isLoading || isCompanyLoading) ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {/* Day headers */}
                {DAY_HEADERS.map((day) => (
                  <div
                    key={day}
                    className="py-2 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {day}
                  </div>
                ))}

                {/* Day cells */}
                {calendarDays.map((date, idx) => {
                  const isCurrentMonth = date.getMonth() === currentMonth;
                  const isToday = isSameDay(date, today);
                  const isSelected = isSameDay(date, selectedDate);
                  const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                  const dayEvents = eventsByDate.get(dateKey) ?? [];
                  const hasEvents = dayEvents.length > 0;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedDate(new Date(date))}
                      className={`
                        relative flex flex-col items-center justify-start p-1.5 min-h-[3.5rem]
                        border border-zinc-100 dark:border-zinc-800 transition-colors text-sm
                        ${isCurrentMonth ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600'}
                        ${isSelected ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
                      `}
                    >
                      <span
                        className={`
                          inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium
                          ${isToday ? 'bg-indigo-600 text-white' : ''}
                        `}
                      >
                        {date.getDate()}
                      </span>
                      {hasEvents && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <div
                              key={ev.id}
                              className={`h-1 w-1 rounded-full ${ev.source === 'google' ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[10px] text-indigo-500 ml-0.5">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Date Events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title="No events"
                description="No events scheduled for this day"
              />
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`rounded-lg border p-3 space-y-2 ${
                      event.source === 'company'
                        ? 'border-emerald-200 dark:border-emerald-800/50'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                          {event.title}
                        </h4>
                        {event.source === 'company' && event.category && (
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${CATEGORY_BADGE_COLORS[event.category] ?? ''}`}>
                            {CATEGORY_LABELS[event.category] ?? event.category}
                          </Badge>
                        )}
                        {event.source === 'google' && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                            Google
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {event.source === 'company' && (
                          <a
                            href={buildGCalTemplateUrl(event)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-indigo-500 transition-colors"
                            title="Add to Google Calendar"
                          >
                            <CalendarPlus className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {event.htmlLink && (
                          <a
                            href={event.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-indigo-500 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>{formatDateRange(event.start, event.end, event.allDay)}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    {event.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
