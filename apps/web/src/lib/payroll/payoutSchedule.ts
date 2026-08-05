export type PayoutSequence = 1 | 2 | 3;

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

  // SN Connect payout policy: first and third Friday of the month.
  // When a month has a fifth Friday, that date is not scheduled in that month;
  // the next month simply starts again on its first Friday.
  const firstPayout = getNthWeekdayOfMonth(year, monthIndex, 5, 1);
  const secondPayout = getNthWeekdayOfMonth(year, monthIndex, 5, 3);

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

/**
 * Returns the payout schedule key that "covers" the given reference date in PH time.
 *
 * Coverage rules (evaluated in PH calendar):
 *   - Day 1 through the 1st payout Friday  → `YYYY-MM:1`  (1st payout of that month)
 *   - Day after 1st payout Friday through the 3rd Friday → `YYYY-MM:2`  (2nd payout of that month)
 *   - After the 3rd Friday, roll to the next month’s `YYYY-MM:1`
 *
 * This keeps each month to two payout options and rolls anything after the second
 * payout into the next month’s first payout.
 */
export function getCurrentPayoutKey(referenceDate: Date = new Date()): string {
  const { year: phYear, month: phMonth, day: phDay } = getPhDateParts(referenceDate);
  const currentMonth = new Date(Date.UTC(phYear, phMonth - 1, 1));
  const currentMonthDates = getMonthPayoutDates(currentMonth);
  const monthKey = toMonthKey(currentMonth);

  if (phDay <= currentMonthDates.firstPayout.getUTCDate()) {
    return `${monthKey}:1`;
  }

  if (phDay <= currentMonthDates.secondPayout.getUTCDate()) {
    return `${monthKey}:2`;
  }

  const nextMonth = addMonths(currentMonth, 1);
  return `${toMonthKey(nextMonth)}:1`;
}

export function getPayoutScheduleOptions(referenceDate: Date = new Date()): PayoutScheduleOption[] {
  const { year: phYear, month: phMonth } = getPhDateParts(referenceDate);
  const currentMonth = new Date(Date.UTC(phYear, phMonth - 1, 1));
  const nowUtcMs = referenceDate.getTime();
  const payouts = getMonthPayoutDates(currentMonth);
  const monthKey = toMonthKey(currentMonth);
  const monthLabel = toMonthLabel(currentMonth);

  const firstDisabled = nowUtcMs > getPayoutCutoffUtcMs(payouts.firstPayout);
  const secondDisabled = nowUtcMs > getPayoutCutoffUtcMs(payouts.secondPayout);

  return [
    {
      key: `${monthKey}:1`,
      monthKey,
      sequence: 1,
      label: `${monthLabel} - 1st Payout (${toShortDateLabel(payouts.firstPayout)})`,
      disabled: firstDisabled,
    },
    {
      key: `${monthKey}:2`,
      monthKey,
      sequence: 2,
      label: `${monthLabel} - 2nd Payout (${toShortDateLabel(payouts.secondPayout)})`,
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
  if (!(sequence === 1 || sequence === 2 || sequence === 3)) {
    return null;
  }

  return {
    monthKey,
    sequence: sequence as PayoutSequence,
    key: `${monthKey}:${sequence}`,
  };
}

export function formatPayoutScheduleLabel(monthKey: string, sequence: PayoutSequence): string {
  const [yearRaw, monthRaw] = monthKey.split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;

  if (!(Number.isFinite(year) && Number.isFinite(monthIndex) && monthIndex >= 0 && monthIndex <= 11)) {
    const fallbackOrdinal = sequence === 1 ? '1st' : sequence === 2 ? '2nd' : '3rd';
    return `${monthKey} - ${fallbackOrdinal} Payout`;
  }

  const date = new Date(Date.UTC(year, monthIndex, 1));
  const monthLabel = toMonthLabel(date);
  const payouts = getMonthPayoutDates(date);
  const payoutDate = sequence === 1 ? payouts.firstPayout : payouts.secondPayout;
  const ordinal = sequence === 1 ? '1st' : sequence === 2 ? '2nd' : '3rd';
  return `${monthLabel} - ${ordinal} Payout (${toShortDateLabel(payoutDate)})`;
}