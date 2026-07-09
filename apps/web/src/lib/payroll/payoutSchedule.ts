export type PayoutSequence = 1 | 2;

export interface PayoutScheduleOption {
  key: string;
  monthKey: string;
  sequence: PayoutSequence;
  label: string;
  disabled: boolean;
}

const PAYOUT_TAG_PREFIX = 'PAYOUT_SCHEDULE:';
const PH_TIMEZONE = 'Asia/Manila';
const PH_UTC_OFFSET_HOURS = 8;

function toMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function toMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: PH_TIMEZONE,
  }).format(date);
}

function toShortDateLabel(date: Date): string {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

function addMonths(date: Date, count: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
}

function getNthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, nth: number): Date {
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const firstWeekdayOffset = (weekday - firstOfMonth.getUTCDay() + 7) % 7;
  const dayOfMonth = 1 + firstWeekdayOffset + (nth - 1) * 7;
  return new Date(Date.UTC(year, monthIndex, dayOfMonth));
}

function getMonthPayoutDates(monthDate: Date): { firstPayout: Date; secondPayout: Date } {
  const year = monthDate.getUTCFullYear();
  const monthIndex = monthDate.getUTCMonth();

  // Friday is day 5. 1st payout is 2nd Friday, 2nd payout is 4th Friday.
  const firstPayout = getNthWeekdayOfMonth(year, monthIndex, 5, 2);
  const secondPayout = getNthWeekdayOfMonth(year, monthIndex, 5, 4);

  return { firstPayout, secondPayout };
}

function getPhDateParts(referenceDate: Date): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(referenceDate);

  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '0');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '0');
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '0');

  return { year, month, day };
}

function phDateTimeToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  second = 0
): number {
  return Date.UTC(year, month - 1, day, hour - PH_UTC_OFFSET_HOURS, minute, second);
}

function getPayoutCutoffUtcMs(payoutDate: Date): number {
  // Option remains selectable through exactly 3:00 PM PHT on payout Friday.
  const year = payoutDate.getUTCFullYear();
  const month = payoutDate.getUTCMonth() + 1;
  const day = payoutDate.getUTCDate();
  return phDateTimeToUtcMs(year, month, day, 15, 0, 0);
}

export function getPayoutScheduleOptions(referenceDate: Date = new Date()): PayoutScheduleOption[] {
  const { year: phYear, month: phMonth } = getPhDateParts(referenceDate);
  const currentMonth = new Date(Date.UTC(phYear, phMonth - 1, 1));
  const currentMonthDates = getMonthPayoutDates(currentMonth);
  const nowUtcMs = referenceDate.getTime();
  const isPastSecondPayout = nowUtcMs > getPayoutCutoffUtcMs(currentMonthDates.secondPayout);
  const targetMonth = isPastSecondPayout ? addMonths(currentMonth, 1) : currentMonth;
  const targetDates = getMonthPayoutDates(targetMonth);
  const monthKey = toMonthKey(targetMonth);
  const monthLabel = toMonthLabel(targetMonth);

  const firstDisabled = !isPastSecondPayout && nowUtcMs > getPayoutCutoffUtcMs(targetDates.firstPayout);
  const secondDisabled = !isPastSecondPayout && nowUtcMs > getPayoutCutoffUtcMs(targetDates.secondPayout);

  return [
    {
      key: `${monthKey}:1`,
      monthKey,
      sequence: 1,
      label: `${monthLabel} - 1st Payout (${toShortDateLabel(targetDates.firstPayout)})`,
      disabled: firstDisabled,
    },
    {
      key: `${monthKey}:2`,
      monthKey,
      sequence: 2,
      label: `${monthLabel} - 2nd Payout (${toShortDateLabel(targetDates.secondPayout)})`,
      disabled: secondDisabled,
    },
  ];
}

export function buildPayoutScheduleTag(monthKey: string, sequence: PayoutSequence): string {
  return `${PAYOUT_TAG_PREFIX}${monthKey}:${sequence}`;
}

export function parsePayoutScheduleTag(notes: string | null | undefined): {
  monthKey: string;
  sequence: PayoutSequence;
  key: string;
} | null {
  if (!(typeof notes === 'string' && notes.length > 0)) {
    return null;
  }

  const line = notes
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(PAYOUT_TAG_PREFIX));

  if (!line) {
    return null;
  }

  const raw = line.slice(PAYOUT_TAG_PREFIX.length);
  const [monthKey, sequenceRaw] = raw.split(':');

  if (!(monthKey && /^\d{4}-\d{2}$/.test(monthKey))) {
    return null;
  }

  const sequence = Number(sequenceRaw);
  if (!(sequence === 1 || sequence === 2)) {
    return null;
  }

  return {
    monthKey,
    sequence,
    key: `${monthKey}:${sequence}`,
  };
}

export function formatPayoutScheduleLabel(monthKey: string, sequence: PayoutSequence): string {
  const [yearRaw, monthRaw] = monthKey.split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;

  if (!(Number.isFinite(year) && Number.isFinite(monthIndex) && monthIndex >= 0 && monthIndex <= 11)) {
    return `${monthKey} - ${sequence === 1 ? '1st' : '2nd'} Payout`;
  }

  const date = new Date(Date.UTC(year, monthIndex, 1));
  const monthLabel = toMonthLabel(date);
  const payoutDates = getMonthPayoutDates(date);
  const payoutDate = sequence === 1 ? payoutDates.firstPayout : payoutDates.secondPayout;
  return `${monthLabel} - ${sequence === 1 ? '1st' : '2nd'} Payout (${toShortDateLabel(payoutDate)})`;
}