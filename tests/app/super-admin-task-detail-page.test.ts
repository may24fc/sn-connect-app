import { toApiTaskStatus, toTaskDetailViewModel } from '@/lib/tasks/task-detail-view-model';
import { describe, expect, it } from 'vitest';

const BASE_TASK = {
  id: 'task-1',
  title: 'Prepare launch checklist',
  description: null,
  assigned_to: 'user-2',
  assigned_by: 'user-1',
  priority: 'high' as const,
  status: 'blocked' as const,
  category: null,
  tags: null,
  due_date: null,
  completed_at: null,
  created_at: '2026-03-29T00:00:00.000Z',
  updated_at: '2026-03-29T00:00:00.000Z',
};

describe('super-admin task detail helpers', () => {
  it('sends UI statuses to the API unchanged', () => {
    expect(toApiTaskStatus('blocked')).toBe('blocked');
    expect(toApiTaskStatus('in_progress')).toBe('in_progress');
  });

  it('maps the real assignee identity and never invents role, department, or due date', () => {
    const task = toTaskDetailViewModel({
      ...BASE_TASK,
      assignee: {
        id: 'user-2',
        name: 'Alex Employee',
        role: 'associate',
        department: 'Marketing',
        position: 'Content Associate',
        avatar_url: 'https://cdn.example/alex.png',
      },
      assigner: {
        id: 'user-1',
        name: 'Morgan Admin',
        role: 'super_admin',
        department: null,
        position: null,
        avatar_url: null,
      },
    });

    expect(task.status).toBe('blocked');
    expect(task.description).toBe('No description provided.');
    expect(task.dueDate).toBeNull();
    expect(task.createdByName).toBe('Morgan Admin');
    expect(task.assignees[0]).toMatchObject({
      name: 'Alex Employee',
      role: 'associate',
      department: 'Marketing',
      avatarUrl: 'https://cdn.example/alex.png',
    });
  });

  it('keeps missing identity fields empty instead of filling placeholders', () => {
    const task = toTaskDetailViewModel({
      ...BASE_TASK,
      assignee: {
        id: 'user-2',
        name: null,
        role: null,
        department: null,
        position: null,
        avatar_url: null,
      },
      assigner: null,
    });

    expect(task.createdByName).toBe('Unknown user');
    expect(task.assignees[0]).toMatchObject({ name: 'Unknown user', role: null, department: null });
  });
});
