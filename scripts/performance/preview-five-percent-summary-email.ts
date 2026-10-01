/**
 * Renders sample 5% Reflection summary emails from synthetic submissions.
 *
 * Calls the real summary engine (OpenAI) so the output matches production, but never
 * touches the database and never sends email. Writes HTML + markdown to
 * docs/samples/five-percent-summary-email/.
 *
 * Usage: pnpm performance:preview-five-percent-email
 * Requires OPENAI_API_KEY in apps/web/.env.local.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { previewPerformanceEvaluationSummaryMarkdown } from '@/lib/performance/evaluation-summary';
import { buildFivePercentSummaryEmail } from '@/lib/performance/five-percent-summary-email';

const MONTH_KEY = '2026-09';
const REVIEW_URL =
  'https://app.sngroup.com.au/admin/performance/monthly-self-evaluations?tab=five-percent';
const OUTPUT_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../docs/samples/five-percent-summary-email'
);

type Area = {
  feelings: string;
  headline: string;
  significance: string;
  rank: number;
  action: string;
};

function reflection(
  cohort: 'employees' | 'interns',
  departmentRole: string,
  submittedAt: string,
  work: Area,
  family: Area,
  personal: Area,
  deepDiveParkingLot: string,
  explorationTopics: string
): Record<string, unknown> {
  return {
    // In production the cohort comes from the submitter's account role (users.role).
    cohort,
    department_role: departmentRole,
    work_feelings: work.feelings,
    work_headline: work.headline,
    work_significance: work.significance,
    work_rank: work.rank,
    work_action: work.action,
    family_feelings: family.feelings,
    family_headline: family.headline,
    family_significance: family.significance,
    family_rank: family.rank,
    family_action: family.action,
    personal_feelings: personal.feelings,
    personal_headline: personal.headline,
    personal_significance: personal.significance,
    personal_rank: personal.rank,
    personal_action: personal.action,
    deep_dive_parking_lot: deepDiveParkingLot,
    exploration_topics: explorationTopics,
    submitted_at: submittedAt,
    updated_at: submittedAt,
  };
}

// Synthetic fixture data. No real employee submissions are used.
const SAMPLE_SUBMISSIONS: Array<Record<string, unknown>> = [
  reflection(
    'employees',
    'Operations',
    '2026-09-24T02:10:00.000Z',
    {
      feelings: 'Stretched but proud',
      headline: 'Closed the vendor onboarding backlog',
      significance:
        'We cleared 18 stalled vendor files, which unblocked payouts for two business units.',
      rank: 8,
      action: 'Document the checklist so the backlog does not rebuild.',
    },
    {
      feelings: 'Grateful',
      headline: 'Weekend trip with my parents',
      significance: 'First proper break together this year.',
      rank: 7,
      action: 'Book one family day each month.',
    },
    {
      feelings: 'Tired',
      headline: 'Sleep has slipped',
      significance: 'Late-night catch-up work is affecting focus in the mornings.',
      rank: 4,
      action: 'Hard stop at 7pm three nights a week.',
    },
    'Approval handoffs between Ops and Finance still rely on chat messages.',
    'A shared approvals tracker; time-blocking for deep work.'
  ),
  reflection(
    'employees',
    'Finance',
    '2026-09-25T05:42:00.000Z',
    {
      feelings: 'Focused',
      headline: 'Month-end close finished two days early',
      significance: 'The new FX rate automation removed most manual conversions.',
      rank: 9,
      action: 'Extend the automation to marketing receipts.',
    },
    {
      feelings: 'Happy',
      headline: 'Helped my sibling with university enrolment',
      significance: 'Felt useful outside of work.',
      rank: 8,
      action: 'Keep Sunday calls going.',
    },
    {
      feelings: 'Steady',
      headline: 'Back to running twice a week',
      significance: 'Energy is noticeably better.',
      rank: 7,
      action: 'Sign up for a 10k in November.',
    },
    'Receipts submitted without categories still need manual follow-up.',
    'Expense category defaults; learning advanced spreadsheet modelling.'
  ),
  reflection(
    'employees',
    'Marketing',
    '2026-09-26T01:15:00.000Z',
    {
      feelings: 'Frustrated',
      headline: 'Campaign launch slipped a week',
      significance: 'Creative approvals waited on feedback from three people.',
      rank: 5,
      action: 'Propose a single approver per campaign.',
    },
    {
      feelings: 'Content',
      headline: 'Quiet month at home',
      significance: 'Stable and supportive.',
      rank: 7,
      action: 'Plan a family dinner for a birthday.',
    },
    {
      feelings: 'Motivated',
      headline: 'Started a design course',
      significance: 'Building skills that help the team directly.',
      rank: 8,
      action: 'Finish two modules before next reflection.',
    },
    'Unclear ownership of final sign-off on ad creatives.',
    'Approval workflow in Control Hub; short-form video editing.'
  ),
  reflection(
    'employees',
    'Sales',
    '2026-09-27T03:30:00.000Z',
    {
      feelings: 'Energised',
      headline: 'Signed two new SFO leads',
      significance: 'Pipeline for Q4 looks healthier than last quarter.',
      rank: 9,
      action: 'Share the outreach script with the team.',
    },
    {
      feelings: 'Stressed',
      headline: 'Caring for a family member who is unwell',
      significance: 'Taking more time than expected; juggling appointments.',
      rank: 4,
      action: 'Ask about flexible hours for the next few weeks.',
    },
    {
      feelings: 'Okay',
      headline: 'Not much personal time',
      significance: 'Work and family are taking most of it.',
      rank: 5,
      action: 'Protect one evening a week.',
    },
    'Would value a clearer flexible-hours policy for carers.',
    'Flexible work options; negotiation skills.'
  ),
  reflection(
    'employees',
    'Engineering',
    '2026-09-28T07:05:00.000Z',
    {
      feelings: 'Satisfied',
      headline: 'Shipped the work tracker insights view',
      significance: 'Leadership can now see task health without asking for updates.',
      rank: 8,
      action: 'Collect feedback and fix rough edges.',
    },
    {
      feelings: 'Calm',
      headline: 'Moved into a new apartment',
      significance: 'Shorter commute gives me back an hour a day.',
      rank: 8,
      action: 'Use the hour for exercise.',
    },
    {
      feelings: 'Curious',
      headline: 'Reading about systems design',
      significance: 'Helps me plan bigger features.',
      rank: 7,
      action: 'Write up one design note per sprint.',
    },
    'On-call expectations after hours are not written down anywhere.',
    'On-call rotation; mentoring associates.'
  ),
  reflection(
    'interns',
    'Marketing',
    '2026-09-25T09:20:00.000Z',
    {
      feelings: 'Excited',
      headline: 'Ran my first social campaign end to end',
      significance: 'Got real responsibility and saw measurable engagement.',
      rank: 9,
      action: 'Ask for feedback on what to improve.',
    },
    {
      feelings: 'Supported',
      headline: 'Family proud of the internship',
      significance: 'Motivating to share progress at home.',
      rank: 8,
      action: 'Keep them updated monthly.',
    },
    {
      feelings: 'Anxious',
      headline: 'Balancing university deadlines',
      significance: 'Thesis and internship deadlines overlapped this month.',
      rank: 5,
      action: 'Share my uni calendar with my supervisor.',
    },
    'Would like clearer expectations on weekly deliverables.',
    'Content analytics; time management.'
  ),
  reflection(
    'interns',
    'Operations',
    '2026-09-26T06:45:00.000Z',
    {
      feelings: 'Unsure',
      headline: 'Learning the onboarding process',
      significance: 'Lots of tools to learn; some steps are undocumented.',
      rank: 6,
      action: 'Write down each step as I learn it.',
    },
    {
      feelings: 'Fine',
      headline: 'Nothing major at home',
      significance: 'Stable month.',
      rank: 7,
      action: 'Visit my grandparents.',
    },
    {
      feelings: 'Hopeful',
      headline: 'Joined a weekend basketball group',
      significance: 'Good way to de-stress.',
      rank: 8,
      action: 'Keep going every Saturday.',
    },
    'Onboarding documentation for associates is scattered across chats and drives.',
    'A single onboarding guide; process mapping.'
  ),
  reflection(
    'interns',
    'Engineering',
    '2026-09-29T04:00:00.000Z',
    {
      feelings: 'Proud',
      headline: 'First PR merged into production',
      significance: 'Confidence boost; the review feedback was kind and useful.',
      rank: 9,
      action: 'Pick up a slightly larger ticket next month.',
    },
    {
      feelings: 'Missing home',
      headline: 'Living away from family for uni',
      significance: 'Some homesickness this month.',
      rank: 5,
      action: 'Schedule weekly video calls.',
    },
    {
      feelings: 'Good',
      headline: 'Sleeping better',
      significance: 'Stopped coding past midnight.',
      rank: 7,
      action: 'Keep the routine.',
    },
    'Pairing sessions with seniors are very helpful but happen rarely.',
    'Regular pairing slots; testing practices.'
  ),
];

const EXPECTED_COUNT = 10;
const PENDING_NAMES = ['Sample Pending Member A', 'Sample Pending Member B'];

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Add it to apps/web/.env.local.');
  }
  console.info(`Generating summary for ${SAMPLE_SUBMISSIONS.length} synthetic submissions...`);
  const summaryMarkdown = await previewPerformanceEvaluationSummaryMarkdown(
    'five_percent',
    MONTH_KEY,
    SAMPLE_SUBMISSIONS
  );
  const generatedAt = new Date().toISOString();

  const allSubmitted = buildFivePercentSummaryEmail({
    monthKey: MONTH_KEY,
    trigger: 'all_submitted',
    summaryMarkdown,
    submittedCount: SAMPLE_SUBMISSIONS.length,
    expectedCount: SAMPLE_SUBMISSIONS.length,
    pendingNames: [],
    dueDateLabel: 'Sep 30',
    generatedAt,
    reviewUrl: REVIEW_URL,
  });

  const deadline = buildFivePercentSummaryEmail({
    monthKey: MONTH_KEY,
    trigger: 'deadline',
    summaryMarkdown,
    submittedCount: SAMPLE_SUBMISSIONS.length,
    expectedCount: EXPECTED_COUNT,
    pendingNames: PENDING_NAMES,
    dueDateLabel: 'Sep 30',
    generatedAt,
    reviewUrl: REVIEW_URL,
  });

  const manual = buildFivePercentSummaryEmail({
    monthKey: MONTH_KEY,
    trigger: 'manual',
    summaryMarkdown,
    submittedCount: SAMPLE_SUBMISSIONS.length,
    expectedCount: EXPECTED_COUNT,
    pendingNames: PENDING_NAMES,
    dueDateLabel: 'Sep 30',
    generatedAt,
    reviewUrl: REVIEW_URL,
  });

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(resolve(OUTPUT_DIR, 'summary.md'), `${summaryMarkdown}\n`);
  writeFileSync(resolve(OUTPUT_DIR, 'email-all-submitted.html'), allSubmitted.html);
  writeFileSync(resolve(OUTPUT_DIR, 'email-deadline.html'), deadline.html);
  writeFileSync(resolve(OUTPUT_DIR, 'email-manual.html'), manual.html);

  console.info(`Subject (all submitted): ${allSubmitted.subject}`);
  console.info(`Subject (deadline):      ${deadline.subject}`);
  console.info(`Subject (manual):        ${manual.subject}`);
  console.info(`Wrote samples to ${OUTPUT_DIR}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
