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

// Baseline anchor for biweekly payouts (Friday July 24, 2026)
const BASELINE_UTC_MS = Date.UTC(2026, 6, 24); // months 0-indexed: 6 = July

function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function getBiweeklyPayoutsInMonth(monthDate: Date): Date[] {
  const monthStart = startOfMonthUtc(monthDate);
  const monthEnd = endOfMonthUtc(monthDate);

  const payouts: Date[] = [];

  // Start from baseline and step by 14 days until beyond month end.
  // Find the first baseline occurrence that is <= monthEnd.
  // If baseline is after monthEnd, step backward by 14 days until before monthEnd.
  let cursorMs = BASELINE_UTC_MS;

  // Move cursor forward until it's >= monthStart - 14 days to ensure we cover earlier payouts
  while (cursorMs < monthStart.getTime() - 14 * 24 * 60 * 60 * 1000) {
    cursorMs += 14 * 24 * 60 * 60 * 1000;
  }

  // Step backward if we overshot
  while (cursorMs - 14 * 24 * 60 * 60 * 1000 >= monthStart.getTime()) {
    cursorMs -= 14 * 24 * 60 * 60 * 1000;
  }

  // Collect payouts that fall within the month
  while (cursorMs <= monthEnd.getTime()) {
    const d = new Date(cursorMs);
    // normalize to Friday (baseline is Friday, stepping by 14 days preserves weekday)
    if (d.getUTCDay() === 5 && d >= monthStart && d <= monthEnd) {
      payouts.push(d);
    }
    cursorMs += 14 * 24 * 60 * 60 * 1000;
  }

  // As a fallback, ensure at least one Friday payout exists in the month (shouldn't be needed)
  if (payouts.length === 0) {
    // find the first Friday in the month
    const first = monthStart.getUTCDay();
    const offset = (5 - first + 7) % 7;
    const d = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), 1 + offset));
    payouts.push(d);
  }

  return payouts.sort((a, b) => a.getTime() - b.getTime());
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
 *   - Day after 1st payout Friday through month-end → `YYYY-MM:2`  (2nd payout of that month)
 *
 * This ensures the default filter stays on the 2nd payout for the rest of the month
 * after the 1st payout has already occurred, rather than jumping forward prematurely.
 */
export function getCurrentPayoutKey(referenceDate: Date = new Date()): string {
  const { year: phYear, month: phMonth, day: phDay } = getPhDateParts(referenceDate);
  const currentMonth = new Date(Date.UTC(phYear, phMonth - 1, 1));
  const monthKey = toMonthKey(currentMonth);
  const payouts = getBiweeklyPayoutsInMonth(currentMonth);

  // Determine sequence by comparing day to payout dates
  let sequence: number = 1;
  for (let i = 0; i < payouts.length; i++) {
    const p = payouts[i];
    if (!p) continue;
    const pd = p.getUTCDate();
    if (phDay <= pd) {
      sequence = i + 1;
      break;
    }
    // if we reached the end without break, choose last
    if (i === payouts.length - 1) {
      sequence = payouts.length;
    }
  }

  // Clamp to PayoutSequence union (1..3)
  const seq = Math.min(Math.max(sequence, 1), 3) as PayoutSequence;
  return `${monthKey}:${seq}`;
}

export function getPayoutScheduleOptions(referenceDate: Date = new Date()): PayoutScheduleOption[] {
  const { year: phYear, month: phMonth } = getPhDateParts(referenceDate);
  const currentMonth = new Date(Date.UTC(phYear, phMonth - 1, 1));
  const nowUtcMs = referenceDate.getTime();
  // Determine if we've passed the last payout cutoff of the current month
  const currentPayouts = getBiweeklyPayoutsInMonth(currentMonth);
  const lastPayout = currentPayouts[currentPayouts.length - 1] ?? startOfMonthUtc(currentMonth);
  const isPastLastPayout = nowUtcMs > getPayoutCutoffUtcMs(lastPayout);

  const targetMonth = isPastLastPayout ? addMonths(currentMonth, 1) : currentMonth;
  const payouts = getBiweeklyPayoutsInMonth(targetMonth);
  const monthKey = toMonthKey(targetMonth);
  const monthLabel = toMonthLabel(targetMonth);

  return payouts.map((payoutDate, idx) => {
    const seq = (idx + 1) as PayoutSequence;
    const disabled = nowUtcMs > getPayoutCutoffUtcMs(payoutDate) && !isPastLastPayout;
    const ordinal = seq === 1 ? '1st' : seq === 2 ? '2nd' : '3rd';
    return {
      key: `${monthKey}:${seq}`,
      monthKey,
      sequence: seq,
      label: `${monthLabel} - ${ordinal} Payout (${toShortDateLabel(payoutDate)})`,
      disabled,
    };
  });
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
    return `${monthKey} - ${sequence === 1 ? '1st' : '2nd'} Payout`;
  }

  const date = new Date(Date.UTC(year, monthIndex, 1));
  const monthLabel = toMonthLabel(date);
  const payouts = getBiweeklyPayoutsInMonth(date);
  const seqIndex = Math.min(Math.max(sequence - 1, 0), payouts.length - 1);
  const payoutDate = payouts[seqIndex] ?? payouts[0];
  const ordinal = sequence === 1 ? '1st' : sequence === 2 ? '2nd' : '3rd';
  return `${monthLabel} - ${ordinal} Payout (${toShortDateLabel(payoutDate)})`;
}