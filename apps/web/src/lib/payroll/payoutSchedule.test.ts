import { describe, expect, it } from 'vitest';
import { formatPayoutScheduleLabel, getPayoutScheduleOptions } from './payoutSchedule';

describe('payout schedule labels', () => {
  it('shows the payout date in the Finance date style', () => {
    expect(formatPayoutScheduleLabel('2026-11', 1)).toBe('November - 1st Payout (6 Nov 2026)');
  });

  it('uses the same date style for selectable options', () => {
    const labels = getPayoutScheduleOptions(new Date('2026-10-01T00:00:00Z')).map(
      (option) => option.label
    );
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) expect(label).toMatch(/Payout \(\d{1,2} [A-Z][a-z]{2} \d{4}\)$/);
  });
});
