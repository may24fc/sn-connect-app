import { formatFinanceDate } from '@/lib/format';

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
const DAY_MS = 24 * 60 * 60 * 1000;
const PAYOUT_INTERVAL_MS = 14 * DAY_MS;
// The continuous biweekly cadence is anchored to the confirmed October 2026 schedule.
const PAYOUT_ANCHOR_UTC_MS = Date.UTC(2026, 9, 2);

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

/** Payout dates are UTC-midnight calendar days; shown as `6 Nov 2026` to match Finance dates. */
function toShortDateLabel(date: Date): string {
  return formatFinanceDate(date.toISOString().slice(0, 10));
}

function getMonthPayoutDates(monthDate: Date): Date[] {
  const monthStartUtcMs = Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1);
  const nextMonthStartUtcMs = Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1);
  const firstCycle = Math.ceil((monthStartUtcMs - PAYOUT_ANCHOR_UTC_MS) / PAYOUT_INTERVAL_MS);
  const payoutDates: Date[] = [];

  for (
    let payoutUtcMs = PAYOUT_ANCHOR_UTC_MS + firstCycle * PAYOUT_INTERVAL_MS;
    payoutUtcMs < nextMonthStartUtcMs;
    payoutUtcMs += PAYOUT_INTERVAL_MS
  ) {
    payoutDates.push(new Date(payoutUtcMs));
  }

  return payoutDates;
}

function getPayoutSequence(payoutDate: Date): PayoutSequence {
  const index = getMonthPayoutDates(payoutDate).findIndex(
    (date) => date.getTime() === payoutDate.getTime()
  );
  return (index + 1) as PayoutSequence;
}

function toOrdinal(sequence: PayoutSequence): string {
  return sequence === 1 ? '1st' : sequence === 2 ? '2nd' : '3rd';
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
  // Option remains selectable through exactly 5:00 PM PHT on payout Friday.
  const year = payoutDate.getUTCFullYear();
  const month = payoutDate.getUTCMonth() + 1;
  const day = payoutDate.getUTCDate();
  return phDateTimeToUtcMs(year, month, day, 17, 0, 0);
}

function toPayoutOption(payoutDate: Date, nowUtcMs: number): PayoutScheduleOption {
  const sequence = getPayoutSequence(payoutDate);
  const monthKey = toMonthKey(payoutDate);

  return {
    key: `${monthKey}:${sequence}`,
    monthKey,
    sequence,
    label: `${toMonthLabel(payoutDate)} - ${toOrdinal(sequence)} Payout (${toShortDateLabel(payoutDate)})`,
    disabled: nowUtcMs > getPayoutCutoffUtcMs(payoutDate),
  };
}

/**
 * Returns the payout schedule key that covers the given reference date in PH time.
 * The key advances on each payout calendar day, while dates remain exactly 14 days
 * apart across month and year boundaries.
 */
export function getCurrentPayoutKey(referenceDate: Date = new Date()): string {
  const { year: phYear, month: phMonth, day: phDay } = getPhDateParts(referenceDate);
  const phCalendarDateUtcMs = Date.UTC(phYear, phMonth - 1, phDay);
  const cycle = Math.ceil((phCalendarDateUtcMs - PAYOUT_ANCHOR_UTC_MS) / PAYOUT_INTERVAL_MS);
  const payoutDate = new Date(PAYOUT_ANCHOR_UTC_MS + cycle * PAYOUT_INTERVAL_MS);
  const sequence = getPayoutSequence(payoutDate);
  return `${toMonthKey(payoutDate)}:${sequence}`;
}

export function getPayoutScheduleOptions(referenceDate: Date = new Date()): PayoutScheduleOption[] {
  const { year: phYear, month: phMonth } = getPhDateParts(referenceDate);
  const currentMonth = new Date(Date.UTC(phYear, phMonth - 1, 1));
  const nowUtcMs = referenceDate.getTime();
  const payouts = getMonthPayoutDates(currentMonth);
  const options = payouts.map((payoutDate) => toPayoutOption(payoutDate, nowUtcMs));
  const lastPayout = payouts[payouts.length - 1];

  if (lastPayout && options.every((option) => option.disabled)) {
    const nextPayout = new Date(lastPayout.getTime() + PAYOUT_INTERVAL_MS);
    options.push(toPayoutOption(nextPayout, nowUtcMs));
  }

  return options;
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

  if (
    !(Number.isFinite(year) && Number.isFinite(monthIndex) && monthIndex >= 0 && monthIndex <= 11)
  ) {
    return `${monthKey} - ${toOrdinal(sequence)} Payout`;
  }

  const date = new Date(Date.UTC(year, monthIndex, 1));
  const baseLabel = `${toMonthLabel(date)} - ${toOrdinal(sequence)} Payout`;
  const payoutDate = getMonthPayoutDates(date)[sequence - 1];
  return payoutDate ? `${baseLabel} (${toShortDateLabel(payoutDate)})` : baseLabel;
}
