import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/performance/_lib', () => ({ listPerformanceAudience: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendHrReportEmail: vi.fn() }));
vi.mock('@/lib/performance/evaluation-summary', () => ({
  generatePerformanceEvaluationSummary: vi.fn(),
}));

import {
  decideFivePercentDelivery,
  evaluateFivePercentCompletion,
  parseSummaryRecipients,
} from '@/lib/performance/five-percent-summary-delivery';
import {
  buildFivePercentSummaryEmail,
  renderSummaryMarkdownToEmailHtml,
} from '@/lib/performance/five-percent-summary-email';

const audience = [
  { userId: 'u1', fullName: 'Alex Rivera' },
  { userId: 'u2', fullName: 'Sam Cruz' },
  { userId: 'u3', fullName: 'Jordan Lee' },
];

describe('parseSummaryRecipients', () => {
  it('splits, trims, validates and de-duplicates addresses', () => {
    expect(
      parseSummaryRecipients(
        ' boss@sngroup.com.au, ops@sngroup.com.au;BOSS@sngroup.com.au not-an-email '
      )
    ).toEqual(['boss@sngroup.com.au', 'ops@sngroup.com.au']);
  });

  it('returns an empty list when unset', () => {
    expect(parseSummaryRecipients(undefined)).toEqual([]);
    expect(parseSummaryRecipients('')).toEqual([]);
  });
});

describe('evaluateFivePercentCompletion', () => {
  it('counts expected members and lists who is pending', () => {
    expect(evaluateFivePercentCompletion(audience, new Set(['u1', 'u3', 'outsider']))).toEqual({
      expectedCount: 3,
      submittedCount: 2,
      pendingNames: ['Sam Cruz'],
    });
  });
});

describe('decideFivePercentDelivery', () => {
  const complete = evaluateFivePercentCompletion(audience, new Set(['u1', 'u2', 'u3']));
  const partial = evaluateFivePercentCompletion(audience, new Set(['u1']));
  const none = evaluateFivePercentCompletion(audience, new Set());
  const activeWindow = { key: '2026-09', stage: 'active' as const };
  const deadlineWindow = { key: '2026-09', stage: 'deadline' as const };

  it('sends on submission once everyone has submitted', () => {
    expect(
      decideFivePercentDelivery({
        requestedTrigger: 'all_submitted',
        monthKey: '2026-09',
        completion: complete,
        window: activeWindow,
        alreadyEmailed: false,
      })
    ).toEqual({ send: true, trigger: 'all_submitted' });
  });

  it('waits on submission while members are still pending', () => {
    expect(
      decideFivePercentDelivery({
        requestedTrigger: 'all_submitted',
        monthKey: '2026-09',
        completion: partial,
        window: deadlineWindow,
        alreadyEmailed: false,
      })
    ).toEqual({ send: false, reason: 'awaiting_submissions' });
  });

  it('never sends twice for the same month', () => {
    expect(
      decideFivePercentDelivery({
        requestedTrigger: 'all_submitted',
        monthKey: '2026-09',
        completion: complete,
        window: activeWindow,
        alreadyEmailed: true,
      })
    ).toEqual({ send: false, reason: 'already_emailed' });
  });

  it('does not send the deadline fallback before the deadline', () => {
    expect(
      decideFivePercentDelivery({
        requestedTrigger: 'deadline',
        monthKey: '2026-09',
        completion: partial,
        window: activeWindow,
        alreadyEmailed: false,
      })
    ).toEqual({ send: false, reason: 'before_deadline' });
  });

  it('sends a partial summary at the deadline', () => {
    expect(
      decideFivePercentDelivery({
        requestedTrigger: 'deadline',
        monthKey: '2026-09',
        completion: partial,
        window: deadlineWindow,
        alreadyEmailed: false,
      })
    ).toEqual({ send: true, trigger: 'deadline' });
  });

  it('labels a deadline run as all_submitted when nobody is pending', () => {
    expect(
      decideFivePercentDelivery({
        requestedTrigger: 'deadline',
        monthKey: '2026-09',
        completion: complete,
        window: deadlineWindow,
        alreadyEmailed: false,
      })
    ).toEqual({ send: true, trigger: 'all_submitted' });
  });

  it('skips the deadline run when nothing was submitted', () => {
    expect(
      decideFivePercentDelivery({
        requestedTrigger: 'deadline',
        monthKey: '2026-09',
        completion: none,
        window: deadlineWindow,
        alreadyEmailed: false,
      })
    ).toEqual({ send: false, reason: 'no_submissions' });
  });

  it('skips when there is no expected audience', () => {
    expect(
      decideFivePercentDelivery({
        requestedTrigger: 'all_submitted',
        monthKey: '2026-09',
        completion: evaluateFivePercentCompletion([], new Set()),
        window: activeWindow,
        alreadyEmailed: false,
      })
    ).toEqual({ send: false, reason: 'no_audience' });
  });
});

describe('renderSummaryMarkdownToEmailHtml', () => {
  it('renders headings, lists, quotes and inline emphasis', () => {
    const html = renderSummaryMarkdownToEmailHtml(
      [
        '## Executive Form Summary',
        '### 1. Cohort Snapshot',
        '#### Employees',
        '* **Volume:** 4 submissions',
        '* 🟢 **Positive (60%):** Upbeat',
        '1. **Immediate Fix:** Do the thing',
        '> **Notable Feedback:** "Needs *more* support"',
        'Closing paragraph.',
      ].join('\n')
    );

    expect(html).toContain('<h2');
    expect(html).toContain('>Executive Form Summary</h2>');
    expect(html).toContain('<h3');
    expect(html).toContain('<h4');
    expect(html).toContain('<ul');
    expect(html).toContain(
      '<li style="margin:0 0 6px;"><strong>Volume:</strong> 4 submissions</li>'
    );
    expect(html).toContain('<ol');
    expect(html).toContain('<blockquote');
    expect(html).toContain('<em>more</em>');
    expect(html).toContain('Closing paragraph.</p>');
  });

  it('escapes HTML from model output', () => {
    const html = renderSummaryMarkdownToEmailHtml('* <script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('buildFivePercentSummaryEmail', () => {
  const base = {
    monthKey: '2026-09',
    summaryMarkdown: '## Executive Form Summary',
    expectedCount: 3,
    dueDateLabel: 'Sep 30',
    generatedAt: '2026-09-30T10:00:00.000Z',
    reviewUrl:
      'https://app.sngroup.com.au/admin/performance/monthly-self-evaluations?tab=five-percent',
  };

  it('describes a complete month', () => {
    const email = buildFivePercentSummaryEmail({
      ...base,
      trigger: 'all_submitted',
      submittedCount: 3,
      pendingNames: [],
    });

    expect(email.subject).toBe('5% Reflection Summary: September 2026 (all 3 submitted)');
    expect(email.html).toContain('All <strong>3</strong> expected team members');
    expect(email.html).not.toContain('Not yet submitted');
  });

  it('lists pending members on a deadline send', () => {
    const email = buildFivePercentSummaryEmail({
      ...base,
      trigger: 'deadline',
      submittedCount: 1,
      pendingNames: ['Sam Cruz', 'Jordan <Lee>'],
    });

    expect(email.subject).toBe('5% Reflection Summary: September 2026 (1 of 3 submitted)');
    expect(email.html).toContain('Not yet submitted (2)');
    expect(email.html).toContain('Sam Cruz, Jordan &lt;Lee&gt;');
  });
  it('explains a manual send and still lists pending members', () => {
    const email = buildFivePercentSummaryEmail({
      ...base,
      trigger: 'manual',
      submittedCount: 2,
      pendingNames: ['Naima Example'],
    });

    expect(email.subject).toBe('5% Reflection Summary: September 2026 (2 of 3 submitted)');
    expect(email.html).toContain('sent manually from Control Hub');
    expect(email.html).toContain('Not yet submitted (1)');
    expect(email.html).toContain('Naima Example');
    expect(email.html).not.toContain('deadline');
  });
});
