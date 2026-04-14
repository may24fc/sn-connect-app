import { describe, expect, it } from 'vitest';

import {
  canManagePerformance,
  isPerformanceAdmin,
} from '../../apps/web/src/app/api/performance/_lib';

describe('performance access helpers', () => {
  it('allows HR leadership roles to manage performance data', () => {
    expect(canManagePerformance('admin')).toBe(true);
    expect(canManagePerformance('super_admin')).toBe(true);
    expect(canManagePerformance('hr')).toBe(true);
    expect(canManagePerformance('cos')).toBe(true);
    expect(canManagePerformance('ceo')).toBe(true);
  });

  it('keeps destructive admin access limited to admin roles', () => {
    expect(isPerformanceAdmin('admin')).toBe(true);
    expect(isPerformanceAdmin('super_admin')).toBe(true);
    expect(isPerformanceAdmin('hr')).toBe(false);
    expect(isPerformanceAdmin('employee')).toBe(false);
    expect(isPerformanceAdmin(null)).toBe(false);
  });
});