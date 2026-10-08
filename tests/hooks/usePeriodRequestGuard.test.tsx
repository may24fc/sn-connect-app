import { usePeriodRequestGuard } from '@/hooks/usePeriodRequestGuard';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('usePeriodRequestGuard', () => {
  it('ignores responses for an old period or an earlier request in the same period', () => {
    const { result, rerender } = renderHook(({ period }) => usePeriodRequestGuard(period), {
      initialProps: { period: '2026-09' },
    });
    const septemberRequest = result.current.begin();
    expect(result.current.isCurrent('2026-09', septemberRequest)).toBe(true);

    rerender({ period: '2026-10' });
    expect(result.current.isCurrent('2026-09', septemberRequest)).toBe(false);
    const firstOctoberRequest = result.current.begin();
    const secondOctoberRequest = result.current.begin();
    expect(result.current.isCurrent('2026-10', firstOctoberRequest)).toBe(false);
    expect(result.current.isCurrent('2026-10', secondOctoberRequest)).toBe(true);
  });
});
