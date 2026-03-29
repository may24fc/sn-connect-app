import { describe, expect, it } from 'vitest';
import { getProbationTrackerViewState } from '../../apps/web/src/app/(admin)/admin/probation/page';

describe('probation page helpers', () => {
  it('returns loading when the probation query is still in flight', () => {
    expect(
      getProbationTrackerViewState({
        isLoading: true,
        hasError: false,
        employeeCount: 0,
      })
    ).toBe('loading');
  });

  it('returns error when the probation query fails', () => {
    expect(
      getProbationTrackerViewState({
        isLoading: false,
        hasError: true,
        employeeCount: 0,
      })
    ).toBe('error');
  });

  it('returns empty when there are no probation records', () => {
    expect(
      getProbationTrackerViewState({
        isLoading: false,
        hasError: false,
        employeeCount: 0,
      })
    ).toBe('empty');
  });

  it('returns ready when probation records exist', () => {
    expect(
      getProbationTrackerViewState({
        isLoading: false,
        hasError: false,
        employeeCount: 3,
      })
    ).toBe('ready');
  });
});