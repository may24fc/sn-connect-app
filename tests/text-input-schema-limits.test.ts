import { aiExpenseCreateSchema } from '@/lib/schemas/ai-expense.schema';
import { createAnnouncementSchema } from '@/lib/schemas/announcement.schema';
import { sfoLeadCreateSchema } from '@/lib/schemas/crm.schema';
import { employeeCreateSchema } from '@/lib/schemas/employee.schema';
import { expenseLogRequestSchema } from '@/lib/schemas/expense.schema';
import { dailyLogProjectEntrySchema } from '@/lib/schemas/internship.schema';
import { createJobPostingSchema } from '@/lib/schemas/job.schema';
import { taskCreateSchema } from '@/lib/schemas/task.schema';
import { uhpClientNoteSchema } from '@/lib/schemas/uhp.schema';
import { describe, expect, it } from 'vitest';

describe('domain-specific text input limits', () => {
  it.each([
    ['employee name', employeeCreateSchema.shape.firstName, 120],
    ['AI expense reason', aiExpenseCreateSchema.shape.reason, 2000],
    ['expense justification', expenseLogRequestSchema.shape.businessJustification, 2000],
    ['job description', createJobPostingSchema.shape.description, 5000],
    ['daily log outcome', dailyLogProjectEntrySchema.shape.outcome, 3000],
    ['UHP note body', uhpClientNoteSchema.shape.body, 5000],
  ])('enforces the %s limit', (_label, schema, maximum) => {
    expect(schema.safeParse('a'.repeat(maximum)).success).toBe(true);
    expect(schema.safeParse('a'.repeat(maximum + 1)).success).toBe(false);
  });

  it('bounds long announcement content', () => {
    const announcement = {
      title: 'Update',
      content: 'a'.repeat(10000),
      category: 'general' as const,
    };

    expect(createAnnouncementSchema.safeParse(announcement).success).toBe(true);
    expect(
      createAnnouncementSchema.safeParse({ ...announcement, content: `${announcement.content}a` })
        .success
    ).toBe(false);
  });

  it('bounds task descriptions', () => {
    const task = {
      title: 'Task',
      description: 'a'.repeat(5000),
    };

    expect(taskCreateSchema.safeParse(task).success).toBe(true);
    expect(
      taskCreateSchema.safeParse({ ...task, description: `${task.description}a` }).success
    ).toBe(false);
  });

  it('bounds CRM narratives independently from short labels', () => {
    const baseLead = {
      customerName: 'Customer',
      platform: 'Meta' as const,
      dateOfContact: '2026-10-06',
      amount: 0,
    };

    expect(
      sfoLeadCreateSchema.safeParse({ ...baseLead, actionPlan: 'a'.repeat(5000) }).success
    ).toBe(true);
    expect(
      sfoLeadCreateSchema.safeParse({ ...baseLead, actionPlan: 'a'.repeat(5001) }).success
    ).toBe(false);
  });
});
