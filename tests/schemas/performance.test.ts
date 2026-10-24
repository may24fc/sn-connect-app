import { describe, expect, it } from 'vitest';

import {
  performanceInsightChatSchema,
  performanceInsightConversationListQuerySchema,
  renamePerformanceInsightConversationSchema,
  updateReviewCycleSchema,
} from '../../apps/web/src/lib/schemas/performance.schema';

describe('performance schemas', () => {
  it('accepts quarter/year payload when updating a review cycle', () => {
    const parsed = updateReviewCycleSchema.safeParse({
      id: 'b9e0b53c-a72d-4a4d-9db6-cfd34d23dd29',
      quarter: 'Q3',
      year: 2026,
      okrSubmissionDeadline: '2026-04-10',
      kpiSubmissionDeadline: '2026-04-18',
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects update payload when quarter/year pair is incomplete', () => {
    const parsed = updateReviewCycleSchema.safeParse({
      id: 'b9e0b53c-a72d-4a4d-9db6-cfd34d23dd29',
      quarter: 'Q4',
    });

    expect(parsed.success).toBe(false);
  });
});

describe('performance insight schemas', () => {
  it('defaults the prior-month window and trims the question', () => {
    const parsed = performanceInsightChatSchema.parse({
      evaluationKind: 'five_percent',
      periodKey: '2026-10',
      message: '  Who is pending?  ',
    });

    expect(parsed).toEqual({
      evaluationKind: 'five_percent',
      periodKey: '2026-10',
      monthsBack: 3,
      message: 'Who is pending?',
    });
  });

  it.each([
    ['blank question', { message: '   ' }],
    ['question over 2000 characters', { message: 'x'.repeat(2001) }],
    ['window over six months', { monthsBack: 7 }],
    ['fractional window', { monthsBack: 1.5 }],
    ['unsupported kind', { evaluationKind: 'quarterly' }],
    ['quarter period key', { periodKey: '2026-Q4' }],
    ['non-uuid conversation', { conversationId: 'abc' }],
  ])('rejects a %s', (_label, override) => {
    const parsed = performanceInsightChatSchema.safeParse({
      evaluationKind: 'five_percent',
      periodKey: '2026-10',
      message: 'Who is pending?',
      ...override,
    });

    expect(parsed.success).toBe(false);
  });

  it('coerces list paging and bounds titles', () => {
    expect(
      performanceInsightConversationListQuerySchema.parse({ evaluationKind: 'five_percent', limit: '10' })
    ).toEqual({ evaluationKind: 'five_percent', limit: 10, offset: 0 });
    expect(
      performanceInsightConversationListQuerySchema.safeParse({ evaluationKind: 'five_percent', limit: '51' })
        .success
    ).toBe(false);
    expect(renamePerformanceInsightConversationSchema.safeParse({ title: 'x'.repeat(121) }).success).toBe(false);
  });
});
