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

function parseCalendarDateKey(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError('Date must use YYYY-MM-DD format.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RangeError('Date is not a valid calendar day.');
  }
  return { year, month, day };
}

/** Inclusive local calendar dates represented as an inclusive start and exclusive end UTC range. */
export function calendarDateRangeBounds(
  fromDate: string,
  toDate: string,
  timeZone: MetricTimeZone
): { from: string; until: string } {
  const from = parseCalendarDateKey(fromDate);
  const to = parseCalendarDateKey(toDate);
  const fromOrdinal = Date.UTC(from.year, from.month - 1, from.day);
  const toOrdinal = Date.UTC(to.year, to.month - 1, to.day);
  if (fromOrdinal > toOrdinal) throw new RangeError('Start date must not be after end date.');
  const dayAfterTo = new Date(Date.UTC(to.year, to.month - 1, to.day + 1));
  const zone = resolvedTimeZone(timeZone);
  return {
    from: zonedMidnightUtc(from.year, from.month, from.day, zone),
    until: zonedMidnightUtc(
      dayAfterTo.getUTCFullYear(),
      dayAfterTo.getUTCMonth() + 1,
      dayAfterTo.getUTCDate(),
      zone
    ),
  };
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

/** The complete calendar period immediately before the one containing `now`. */
export function previousCalendarPeriodBounds(
  period: CalendarMetricPeriod,
  now: Date,
  timeZone: MetricTimeZone
): { from: string; until: string } {
  const current = calendarPeriodBounds(period, now, timeZone);
  return calendarPeriodBounds(period, new Date(Date.parse(current.from) - 1), timeZone);
}

export function calendarMonthKey(now: Date, timeZone: MetricTimeZone): string {
  const local = zonedParts(now, resolvedTimeZone(timeZone));
  return `${local.year}-${String(local.month).padStart(2, '0')}`;
}

export type CalendarMonthRange = { fromMonth: string; toMonth: string };

export function calendarQuarterKeyFromMonth(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) throw new RangeError('Month must use YYYY-MM format.');
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new RangeError('Month is not valid.');
  return `${match[1]}-Q${Math.ceil(month / 3)}`;
}

export function calendarQuarterMonthRange(quarterKey: string): CalendarMonthRange {
  const match = /^(\d{4})-Q([1-4])$/.exec(quarterKey);
  if (!match) throw new RangeError('Quarter must use YYYY-Q1 through YYYY-Q4 format.');
  const startMonth = (Number(match[2]) - 1) * 3 + 1;
  return {
    fromMonth: `${match[1]}-${String(startMonth).padStart(2, '0')}`,
    toMonth: `${match[1]}-${String(startMonth + 2).padStart(2, '0')}`,
  };
}

export function calendarQuarterOptions(currentMonth: string, years = 5) {
  const currentYear = Number(calendarQuarterKeyFromMonth(currentMonth).slice(0, 4));
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return Array.from({ length: years * 4 }, (_, index) => {
    const absoluteQuarter = currentYear * 4 + 3 - index;
    const year = Math.floor(absoluteQuarter / 4);
    const quarter = (absoluteQuarter % 4) + 1;
    const value = `${year}-Q${quarter}`;
    const { fromMonth, toMonth } = calendarQuarterMonthRange(value);
    return {
      value,
      label: `Q${quarter} ${year} (${monthNames[Number(fromMonth.slice(5)) - 1]}–${monthNames[Number(toMonth.slice(5)) - 1]})`,
    };
  });
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
