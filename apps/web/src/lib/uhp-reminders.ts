import type { UhpReminderType } from '@/lib/uhp';

export interface UhpReminderOccurrence {
  type: UhpReminderType;
  deadlineDate: string | null;
  deliveryDate: string;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function localDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

export function getWeekendAdjustedReminderDate(deadline: Date): Date {
  const day = deadline.getUTCDay();
  if (day === 6) {
    return new Date(deadline.getTime() - 24 * 60 * 60 * 1000);
  }
  if (day === 0) {
    return new Date(deadline.getTime() - 2 * 24 * 60 * 60 * 1000);
  }
  return deadline;
}

export function getUhpReminderOccurrences(
  year: number,
  monthIndex: number
): UhpReminderOccurrence[] {
  const customerDeadline = localDate(year, monthIndex, 5);
  const checksDeadline = localDate(year, monthIndex, 16);

  return [
    {
      type: 'ten_customer_form',
      deadlineDate: isoDate(customerDeadline),
      deliveryDate: isoDate(getWeekendAdjustedReminderDate(customerDeadline)),
    },
    {
      type: 'checks_deposits',
      deadlineDate: isoDate(checksDeadline),
      deliveryDate: isoDate(getWeekendAdjustedReminderDate(checksDeadline)),
    },
  ];
}

export function getNextMonday(from: Date): Date {
  const result = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const daysUntilMonday = (8 - result.getUTCDay()) % 7;
  result.setUTCDate(result.getUTCDate() + daysUntilMonday);
  return result;
}
