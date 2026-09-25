import { describe, expect, it } from 'vitest';
import { getUhpReminderOccurrences, getWeekendAdjustedReminderDate } from './uhp-reminders';

describe('UHP reminder scheduling', () => {
  it('moves Saturday deadlines to Friday', () => {
    expect(
      getWeekendAdjustedReminderDate(new Date('2026-12-05T00:00:00Z')).toISOString().slice(0, 10)
    ).toBe('2026-12-04');
  });

  it('moves Sunday deadlines to Friday', () => {
    expect(
      getWeekendAdjustedReminderDate(new Date('2026-11-16T00:00:00Z')).toISOString().slice(0, 10)
    ).toBe('2026-11-16');
    expect(
      getWeekendAdjustedReminderDate(new Date('2026-08-16T00:00:00Z')).toISOString().slice(0, 10)
    ).toBe('2026-08-14');
  });

  it('builds both monthly occurrences', () => {
    expect(getUhpReminderOccurrences(2026, 11)).toEqual([
      { type: 'ten_customer_form', deadlineDate: '2026-12-05', deliveryDate: '2026-12-04' },
      { type: 'checks_deposits', deadlineDate: '2026-12-16', deliveryDate: '2026-12-16' },
    ]);
  });
});
