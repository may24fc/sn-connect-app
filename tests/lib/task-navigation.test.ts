import { getTaskDetailPath } from '@/lib/task-navigation';
import { describe, expect, it } from 'vitest';

describe('getTaskDetailPath', () => {
  it('preserves the employee Tasks page as the return destination', () => {
    expect(getTaskDetailPath('task-1', '/tasks')).toBe('/tasks/task-1?returnTo=%2Ftasks');
  });

  it('preserves the super-admin Tasks page as the return destination', () => {
    expect(getTaskDetailPath('task-1', '/super-admin/tasks')).toBe(
      '/super-admin/tasks/task-1?returnTo=%2Fsuper-admin%2Ftasks'
    );
  });
});
