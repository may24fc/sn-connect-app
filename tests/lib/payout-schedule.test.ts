import { getPayoutScheduleOptions } from '@/lib/payroll/payoutSchedule';
import { describe, expect, it } from 'vitest';

describe('getPayoutScheduleOptions', () => {
  it('offers next month first payout after both current-month cutoffs', () => {
    const options = getPayoutScheduleOptions(new Date('2026-10-24T00:00:00.000Z'));

    expect(options.slice(0, 2).every((option) => option.disabled)).toBe(true);
    expect(options[2]).toMatchObject({ key: '2026-11:1', disabled: false, sequence: 1 });
  });
});
