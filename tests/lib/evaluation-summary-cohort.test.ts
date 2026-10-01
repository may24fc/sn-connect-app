import { beforeEach, describe, expect, it, vi } from 'vitest';

const { chatMock } = vi.hoisted(() => ({ chatMock: vi.fn() }));

vi.mock('@hr-portal/ai', () => ({ chat: chatMock }));

import {
  generatePerformanceEvaluationSummary,
  resolveSubmissionCohort,
} from '@/lib/performance/evaluation-summary';

type QueryResult = { data: unknown; error: null };

/** Minimal chainable Supabase stub: every builder method returns itself; awaiting resolves the table's result. */
function createSupabaseStub(results: Record<string, QueryResult>) {
  return {
    from(table: string) {
      const result = results[table] ?? { data: null, error: null };
      // A resolved promise with chain methods, so both `await query` and `.maybeSingle()` work.
      const builder: Promise<QueryResult> & Record<string, () => unknown> = Object.assign(
        Promise.resolve(result),
        {
          select: () => builder,
          eq: () => builder,
          is: () => builder,
          order: () => builder,
          in: () => builder,
          upsert: () => builder,
          maybeSingle: () => Promise.resolve(result),
          single: () => Promise.resolve(result),
        }
      );
      return builder;
    },
  };
}

describe('resolveSubmissionCohort', () => {
  it('uses the account role even when department_role is a department name', () => {
    expect(resolveSubmissionCohort('associate', { department_role: 'Marketing' })).toBe('interns');
    expect(resolveSubmissionCohort('employee', { department_role: 'Associate' })).toBe('employees');
    expect(resolveSubmissionCohort('admin', { department_role: 'Operations' })).toBe('employees');
  });

  it('falls back to the department_role text when the role is unknown', () => {
    expect(resolveSubmissionCohort(null, { department_role: 'Associate' })).toBe('interns');
    expect(resolveSubmissionCohort(undefined, { department_role: 'Finance' })).toBe('employees');
  });
});

describe('generatePerformanceEvaluationSummary cohort split', () => {
  beforeEach(() => {
    chatMock.mockReset();
    chatMock.mockResolvedValue({ message: '## Executive Form Summary' });
  });

  it('sends associates to the interns cohort and keeps user ids out of the prompt', async () => {
    const supabase = createSupabaseStub({
      five_percent_reflections: {
        data: [
          { user_id: 'user-employee', department_role: 'Marketing', work_headline: 'Shipped' },
          { user_id: 'user-associate', department_role: 'Marketing', work_headline: 'Learned' },
        ],
        error: null,
      },
      users: {
        data: [
          { id: 'user-employee', role: 'employee' },
          { id: 'user-associate', role: 'associate' },
        ],
        error: null,
      },
      performance_evaluation_summaries: {
        data: {
          evaluation_kind: 'five_percent',
          period_key: '2026-09',
          summary_markdown: '## Executive Form Summary',
          total_submissions_analyzed: 2,
          sentiment_distribution: null,
          source_snapshot_hash: 'hash',
          generated_at: '2026-09-30T00:00:00.000Z',
          generated_by: null,
          created_at: '2026-09-30T00:00:00.000Z',
          updated_at: '2026-09-30T00:00:00.000Z',
        },
        error: null,
      },
    });

    // The stored row is returned for the "existing" lookup too, but its hash never matches,
    // so the summary is regenerated and the prompt is built.
    await generatePerformanceEvaluationSummary(supabase, null, {
      evaluationKind: 'five_percent',
      periodKey: '2026-09',
      forceRegenerate: true,
    });

    const prompt = chatMock.mock.calls[0]?.[0]?.[0]?.content as string;
    expect(prompt).toContain('"employeeSubmissions":1');
    expect(prompt).toContain('"internSubmissions":1');
    expect(prompt).not.toContain('user-employee');
    expect(prompt).not.toContain('user-associate');
  });
});
