import { describe, expect, it } from 'vitest';

import {
  canManagePerformance,
  isPerformanceAdmin,
} from '../../apps/web/src/app/api/performance/_lib';

describe('performance access helpers', () => {
  it('allows admin and super admin to manage performance data', () => {
    expect(canManagePerformance('admin')).toBe(true);
    expect(canManagePerformance('super_admin')).toBe(true);
    expect(canManagePerformance('hr')).toBe(false);
    expect(canManagePerformance('cos')).toBe(false);
    expect(canManagePerformance('ceo')).toBe(false);
  });

  it('keeps destructive admin access limited to admin roles', () => {
    expect(isPerformanceAdmin('admin')).toBe(true);
    expect(isPerformanceAdmin('super_admin')).toBe(true);
    expect(isPerformanceAdmin('hr')).toBe(false);
    expect(isPerformanceAdmin('employee')).toBe(false);
    expect(isPerformanceAdmin(null)).toBe(false);
  });
});
