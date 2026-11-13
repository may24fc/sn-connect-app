import { projectCreateSchema } from '@/lib/schemas/project.schema';
import {
  crossDepartmentWorkRequestCreateSchema,
  crossDepartmentWorkRequestResponseSchema,
} from '@/lib/schemas/work-request.schema';
import { describe, expect, it } from 'vitest';

const DEPARTMENT_ID = '6f1c2b8e-4d3a-4f6b-9a1e-2c3d4e5f6a7b';
const LEAD_ID = '7f1c2b8e-4d3a-4f6b-9a1e-2c3d4e5f6a7b';
const CONTRIBUTOR_ID = '8f1c2b8e-4d3a-4f6b-9a1e-2c3d4e5f6a7b';

describe('cross-department work request schemas', () => {
  it('accepts a complete staffing request', () => {
    expect(
      crossDepartmentWorkRequestCreateSchema.parse({
        targetDepartmentId: DEPARTMENT_ID,
        title: 'Prepare the campaign brief',
        priority: 'high',
        dueDate: '2026-11-30',
      })
    ).toMatchObject({ title: 'Prepare the campaign brief', priority: 'high' });
  });

  it('requires an assignee only at the service decision layer and validates decisions', () => {
    expect(
      crossDepartmentWorkRequestResponseSchema.safeParse({
        action: 'approve',
        assigneeId: CONTRIBUTOR_ID,
      }).success
    ).toBe(true);
    expect(crossDepartmentWorkRequestResponseSchema.safeParse({ action: 'unknown' }).success).toBe(
      false
    );
  });
});

describe('project member roles', () => {
  it('keeps contributors separate from project leads', () => {
    expect(
      projectCreateSchema.safeParse({
        name: 'Launch',
        leadUserId: LEAD_ID,
        coLeadUserIds: [],
        contributorUserIds: [CONTRIBUTOR_ID],
        startDate: '2026-11-01',
        targetEndDate: '2026-11-30',
      }).success
    ).toBe(true);
  });

  it('rejects a person selected as both lead and contributor', () => {
    const result = projectCreateSchema.safeParse({
      name: 'Launch',
      leadUserId: LEAD_ID,
      coLeadUserIds: [],
      contributorUserIds: [LEAD_ID],
      startDate: '2026-11-01',
      targetEndDate: '2026-11-30',
    });
    expect(result.success).toBe(false);
  });
});
