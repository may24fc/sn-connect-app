import { getPayoutScheduleOptions } from '@/lib/payroll/payoutSchedule';
import { describe, expect, it } from 'vitest';

describe('getPayoutScheduleOptions', () => {
  it('offers the third October payout before rolling into November', () => {
    const options = getPayoutScheduleOptions(new Date('2026-10-24T00:00:00.000Z'));

    expect(options.slice(0, 2).every((option) => option.disabled)).toBe(true);
    expect(options[2]).toMatchObject({
      key: '2026-10:3',
      disabled: false,
      sequence: 3,
      label: 'October - 3rd Payout (30 Oct 2026)',
    });
  });

  it('continues to November 13 after the October 30 cutoff', () => {
    const options = getPayoutScheduleOptions(new Date('2026-10-31T00:00:00.000Z'));

    expect(options.slice(0, 3).every((option) => option.disabled)).toBe(true);
    expect(options[3]).toMatchObject({
      key: '2026-11:1',
      disabled: false,
      label: 'November - 1st Payout (13 Nov 2026)',
    });
  });
});
