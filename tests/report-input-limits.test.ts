import {
  WEEKLY_PLAN_ITEM_MAX_LENGTH,
  reportCreateSchema,
  weeklyPlanItemSchema,
} from '@/lib/schemas/report.schema';
import { describe, expect, it } from 'vitest';

describe('weekly plan item limits', () => {
  it('accepts an item at the documented limit', () => {
    expect(weeklyPlanItemSchema.safeParse('a'.repeat(WEEKLY_PLAN_ITEM_MAX_LENGTH)).success).toBe(
      true
    );
  });

  it('returns a corrective message when an item exceeds the limit', () => {
    const result = weeklyPlanItemSchema.safeParse('a'.repeat(WEEKLY_PLAN_ITEM_MAX_LENGTH + 1));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        `Plan item must be ${WEEKLY_PLAN_ITEM_MAX_LENGTH.toLocaleString()} characters or fewer`
      );
    }
  });

  it('applies the item limit through the report request schema', () => {
    const result = reportCreateSchema.safeParse({
      reportType: 'marketing',
      periodStart: '2026-10-05',
      periodEnd: '2026-10-11',
      status: 'submitted',
      marketingContext: {
        submissionKind: 'weekly_plan',
        weeklyPlan: { items: ['a'.repeat(WEEKLY_PLAN_ITEM_MAX_LENGTH + 1)] },
      },
      metrics: [],
    });

    expect(result.success).toBe(false);
  });
});
