/** Calendar periods used by metric views. Rolling windows are deliberately distinct. */
export type CalendarMetricPeriod = 'week' | 'month' | 'quarter' | 'year';
export type MetricTimeZone = 'viewer' | string;

function resolvedTimeZone(timeZone: MetricTimeZone): string {
  return timeZone === 'viewer' ? Intl.DateTimeFormat().resolvedOptions().timeZone : timeZone;
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function zonedMidnightUtc(year: number, month: number, day: number, timeZone: string): string {
  const desiredLocalTime = Date.UTC(year, month - 1, day);
  let utcTime = desiredLocalTime;
  // Re-evaluate the offset at the boundary itself; DST can change within a month.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = zonedParts(new Date(utcTime), timeZone);
    const actualLocalTime = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    utcTime += desiredLocalTime - actualLocalTime;
  }
  return new Date(utcTime).toISOString();
}

/** Inclusive start and exclusive end of a calendar period, represented as UTC instants. */
export function calendarPeriodBounds(
  period: CalendarMetricPeriod,
  now: Date,
  timeZone: MetricTimeZone
): { from: string; until: string } {
  const zone = resolvedTimeZone(timeZone);
  const local = zonedParts(now, zone);
  const { year, day } = local;
  const month = local.month - 1;
  let start: Date;
  let end: Date;

  if (period === 'week') {
    const daysSinceMonday = (new Date(Date.UTC(year, month, day)).getUTCDay() + 6) % 7;
    start = new Date(Date.UTC(year, month, day - daysSinceMonday));
    end = new Date(Date.UTC(year, month, day - daysSinceMonday + 7));
  } else if (period === 'quarter') {
    const quarterMonth = Math.floor(month / 3) * 3;
    start = new Date(Date.UTC(year, quarterMonth, 1));
    end = new Date(Date.UTC(year, quarterMonth + 3, 1));
  } else if (period === 'year') {
    start = new Date(Date.UTC(year, 0, 1));
    end = new Date(Date.UTC(year + 1, 0, 1));
  } else {
    start = new Date(Date.UTC(year, month, 1));
    end = new Date(Date.UTC(year, month + 1, 1));
  }

  return {
    from: zonedMidnightUtc(
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      start.getUTCDate(),
      zone
    ),
    until: zonedMidnightUtc(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate(), zone),
  };
}

export function calendarMonthKey(now: Date, timeZone: MetricTimeZone): string {
  const local = zonedParts(now, resolvedTimeZone(timeZone));
  return `${local.year}-${String(local.month).padStart(2, '0')}`;
}

export function yearPeriodOptions(firstYear: number, now: Date, timeZone: MetricTimeZone) {
  const latestYear = Math.max(firstYear, zonedParts(now, resolvedTimeZone(timeZone)).year);
  return [
    { value: 'all', label: 'All Time' },
    ...Array.from({ length: latestYear - firstYear + 1 }, (_, index) => {
      const year = String(latestYear - index);
      return { value: year, label: year };
    }),
  ];
}
