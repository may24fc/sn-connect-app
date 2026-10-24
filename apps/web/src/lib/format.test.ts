import { describe, expect, it } from 'vitest';
import { formatFinanceDateRange } from './format';

describe('formatFinanceDateRange', () => {
  it('shows a single-day period once', () => {
    expect(formatFinanceDateRange('2026-10-16', '2026-10-16')).toBe('16 Oct 2026');
  });

  it('collapses the shared month and year', () => {
    expect(formatFinanceDateRange('2026-10-01', '2026-10-15')).toBe('1–15 Oct 2026');
    // ICU separates multi-part ranges with thin spaces (U+2009).
    expect(formatFinanceDateRange('2026-10-16', '2026-11-03')).toBe('16 Oct – 3 Nov 2026');
  });

  it('keeps both years when the period spans a new year', () => {
    expect(formatFinanceDateRange('2026-12-28', '2027-01-03')).toBe(
      '28 Dec 2026 – 3 Jan 2027'
    );
  });

  it('falls back without collapsing for missing or reversed dates', () => {
    expect(formatFinanceDateRange(null, '2026-10-16')).toBe('—');
    expect(formatFinanceDateRange('2026-10-16', '2026-10-02')).toBe('16 Oct 2026 – 2 Oct 2026');
  });
});
