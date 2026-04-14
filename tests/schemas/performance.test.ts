import { describe, expect, it } from 'vitest';

import {
  createReviewCycleSchema,
  updateReviewCycleSchema,
} from '../../apps/web/src/lib/schemas/performance.schema';

describe('performance schemas', () => {
  it('accepts OKR and KPI submission deadlines when creating a review cycle', () => {
    const parsed = createReviewCycleSchema.safeParse({
      name: 'Q2 2026 Cycle',
      description: null,
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      okrSubmissionDeadline: '2026-04-15',
      kpiSubmissionDeadline: '2026-04-20',
      selfReviewDeadline: '2026-06-20',
      managerReviewDeadline: '2026-06-25',
      status: 'active',
    });

    expect(parsed.success).toBe(true);
  });

  it('accepts OKR and KPI submission deadlines when updating a review cycle', () => {
    const parsed = updateReviewCycleSchema.safeParse({
      id: 'b9e0b53c-a72d-4a4d-9db6-cfd34d23dd29',
      okrSubmissionDeadline: '2026-04-10',
      kpiSubmissionDeadline: '2026-04-18',
    });

    expect(parsed.success).toBe(true);
  });
});