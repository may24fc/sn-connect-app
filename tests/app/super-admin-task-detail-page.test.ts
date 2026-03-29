import { describe, expect, it } from 'vitest';
import {
  toApiTaskStatus,
  toTaskDetailViewModel,
} from '../../apps/web/src/app/(admin)/super-admin/tasks/[id]/page';

describe('super-admin task detail helpers', () => {
  it('maps blocked UI status to cancelled for the API', () => {
    expect(toApiTaskStatus('blocked')).toBe('cancelled');
    expect(toApiTaskStatus('pending')).toBe('pending');
    expect(toApiTaskStatus('in_progress')).toBe('in_progress');
  });

  it('maps cancelled API tasks back to blocked for the UI', () => {
    const task = toTaskDetailViewModel({
      id: 'task-1',
      title: 'Prepare launch checklist',
      description: null,
      assigned_to: 'user-2',
      assigned_by: 'user-1',
      priority: 'high',
      status: 'cancelled',
      due_date: '2026-03-31T00:00:00.000Z',
      completed_at: null,
      created_at: '2026-03-29T00:00:00.000Z',
      updated_at: '2026-03-29T00:00:00.000Z',
      assignee_name: 'Alex Employee',
      assigner_name: 'Morgan Admin',
    });

    expect(task.status).toBe('blocked');
    expect(task.description).toBe('No description provided.');
    expect(task.assignees[0]?.name).toBe('Alex Employee');
  });
});