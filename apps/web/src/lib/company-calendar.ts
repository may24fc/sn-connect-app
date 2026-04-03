export interface CompanyCalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string | null;
  allDay: boolean;
  htmlLink?: string | null;
  createdAt?: string | null;
}

function getAllDayDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

export function getCompanyCalendarDate(iso: string, allDay: boolean): Date {
  if (allDay && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return getAllDayDate(iso);
  }

  return new Date(iso);
}

export function getCompanyCalendarDayKey(iso: string, allDay: boolean): string {
  const date = getCompanyCalendarDate(iso, allDay);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatCompanyCalendarTimeRange(
  start: string,
  end: string,
  allDay: boolean,
): string {
  if (allDay) {
    return 'All day';
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
}

export function formatCompanyCalendarDateLabel(iso: string, allDay: boolean): string {
  const date = getCompanyCalendarDate(iso, allDay);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatCompanyCalendarNotificationLabel(event: CompanyCalendarEvent): string {
  const date = getCompanyCalendarDate(event.start, event.allDay);

  if (event.allDay) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function getCompanyCalendarMonthParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function buildCompanyCalendarPageLink(basePath: string, event: CompanyCalendarEvent): string {
  const params = new URLSearchParams({
    eventId: event.id,
    month: getCompanyCalendarMonthParam(getCompanyCalendarDate(event.start, event.allDay)),
  });

  return `${basePath}?${params.toString()}`;
}

export function buildAddToCalendarUrl(event: CompanyCalendarEvent): string {
  const params = new URLSearchParams({ action: 'TEMPLATE' });
  params.set('text', event.summary);

  if (event.location) {
    params.set('location', event.location);
  }

  const formatDate = (iso: string, allDay: boolean): string => {
    if (allDay) {
      return iso.slice(0, 10).replace(/-/g, '');
    }

    return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  params.set(
    'dates',
    `${formatDate(event.start, event.allDay)}/${formatDate(event.end || event.start, event.allDay)}`,
  );

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}