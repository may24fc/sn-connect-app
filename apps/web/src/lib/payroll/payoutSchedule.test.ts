import { describe, expect, it } from 'vitest';
import {
  formatPayoutScheduleLabel,
  getCurrentPayoutKey,
  getPayoutScheduleOptions,
} from './payoutSchedule';

describe('payout schedule labels', () => {
  it('shows the payout date in the Finance date style', () => {
    expect(formatPayoutScheduleLabel('2026-11', 1)).toBe('November - 1st Payout (13 Nov 2026)');
  });

  it('continues every 14 days and includes a third payout in October', () => {
    expect(formatPayoutScheduleLabel('2026-10', 1)).toBe('October - 1st Payout (2 Oct 2026)');
    expect(formatPayoutScheduleLabel('2026-10', 2)).toBe('October - 2nd Payout (16 Oct 2026)');
    expect(formatPayoutScheduleLabel('2026-10', 3)).toBe('October - 3rd Payout (30 Oct 2026)');
    expect(formatPayoutScheduleLabel('2026-11', 1)).toBe('November - 1st Payout (13 Nov 2026)');
  });

  it('uses the upcoming biweekly cycle as the current payout key', () => {
    expect(getCurrentPayoutKey(new Date('2026-10-24T00:00:00Z'))).toBe('2026-10:3');
    expect(getCurrentPayoutKey(new Date('2026-10-31T00:00:00Z'))).toBe('2026-11:1');
  });

  it('uses the same date style for selectable options', () => {
    const labels = getPayoutScheduleOptions(new Date('2026-10-01T00:00:00Z')).map(
      (option) => option.label
    );
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) expect(label).toMatch(/Payout \(\d{1,2} [A-Z][a-z]{2} \d{4}\)$/);
  });

  it('keeps the October third payout open through 5:00 PM PHT', () => {
    const atCutoff = getPayoutScheduleOptions(new Date('2026-10-30T09:00:00.000Z'));
    const afterCutoff = getPayoutScheduleOptions(new Date('2026-10-30T09:00:00.001Z'));

    expect(atCutoff.find((option) => option.key === '2026-10:3')?.disabled).toBe(false);
    expect(afterCutoff.find((option) => option.key === '2026-10:3')?.disabled).toBe(true);
  });
});
