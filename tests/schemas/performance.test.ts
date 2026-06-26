import { describe, expect, it } from 'vitest';

import {
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