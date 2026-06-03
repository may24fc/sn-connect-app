import {
  type GeneratePerformanceEvaluationSummaryInput,
  type PerformanceEvaluationDraftKind,
} from '@/lib/schemas/performance.schema';
import { chat } from '@hr-portal/ai';
import { createHash } from 'node:crypto';

type SupabaseClientLike = any;

type SummaryRow = {
  evaluation_kind: PerformanceEvaluationDraftKind;
  period_key: string;
  summary_markdown: string;
  total_submissions_analyzed: number;
  sentiment_distribution: Record<string, number> | null;
  source_snapshot_hash: string;
  generated_at: string;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
};

type SummarySource = {
  records: Array<Record<string, unknown>>;
  snapshotHash: string;
};

export type PerformanceEvaluationSummaryRecord = {
  evaluationKind: PerformanceEvaluationDraftKind;
  periodKey: string;
  summaryMarkdown: string;
  totalSubmissionsAnalyzed: number;
  sentimentDistribution: Record<string, number> | null;
  sourceSnapshotHash: string;
  generatedAt: string;
  generatedBy: string | null;
  isStale: boolean;
};

export type PerformanceEvaluationSummaryLookupResult = {
  summary: PerformanceEvaluationSummaryRecord | null;
  totalSubmissionsAnalyzed: number;
  hasSourceData: boolean;
};

const SUMMARY_TABLE = 'performance_evaluation_summaries';

const SUMMARY_KIND_LABELS: Record<PerformanceEvaluationDraftKind, string> = {
  monthly: 'Monthly Self-Evaluation',
  monthly_call_feedback: 'Monthly Call Feedback',
  five_percent: '5% Reflection',
  quarterly: 'Quarterly Temperature Check',
};

const SUMMARY_SOURCE_CONFIG: Record<
  PerformanceEvaluationDraftKind,
  {
    table: string;
    periodColumn: 'month_key' | 'quarter_key';
    selectColumns: string;
  }
> = {
  monthly: {
    table: 'monthly_self_evaluations',
    periodColumn: 'month_key',
    selectColumns:
      'department_role, top_three_things_worked_on, biggest_impact, impact_reason, significant_achievement, challenge_resolved, monthly_improvement, work_slowdown, unseen_workflow_issue, requested_support, productivity_score, productivity_reason, ownership_outside_role, professional_improvement_area, next_skill_to_learn, leadership_did_well, leadership_can_improve, contributions_visible, comfortable_raising_concerns, hidden_productivity_issue, immediate_improvement, additional_comments, next_month_goal, submitted_at, updated_at',
  },
  monthly_call_feedback: {
    table: 'monthly_call_feedback',
    periodColumn: 'month_key',
    selectColumns:
      'department_role, engagement_level, engagement_reason, valuable_parts, valuable_parts_reason, call_length, clarity_financial_growth_discussion, clarity_icebreaker_conversation_starters, clarity_five_percent_reflection_worksheet, overall_rating, key_takeaway, future_improvements, next_topics, submitted_at, updated_at',
  },
  five_percent: {
    table: 'five_percent_reflections',
    periodColumn: 'month_key',
    selectColumns:
      'department_role, work_feelings, work_headline, work_significance, work_rank, work_action, family_feelings, family_headline, family_significance, family_rank, family_action, personal_feelings, personal_headline, personal_significance, personal_rank, personal_action, deep_dive_parking_lot, exploration_topics, submitted_at, updated_at',
  },
  quarterly: {
    table: 'quarterly_temperature_checks',
    periodColumn: 'quarter_key',
    selectColumns:
      'department_role, energy_workload_score, energy_workload_reason, clarity_support, improvement_change, achievement_recognition, feedback_suggestions, overall_experience_score, overall_experience_reason, submitted_at, updated_at',
  },
};

function formatPeriodLabel(
  evaluationKind: PerformanceEvaluationDraftKind,
  periodKey: string
): string {
  if (evaluationKind === 'quarterly') {
    const [year, quarter] = periodKey.split('-Q');
    return `Q${quarter} ${year}`;
  }

  const [year, month] = periodKey.split('-').map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, 1).toLocaleDateString(
    'en-US',
    {
      month: 'long',
      year: 'numeric',
    }
  );
}

function stripPotentialPii(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\+?\d[\d()\-\s]{7,}\d/g, '[redacted-phone]')
    .trim();
}

function normalizeScalar(value: unknown): unknown {
  if (typeof value === 'string') {
    return stripPotentialPii(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeScalar(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        normalizeScalar(entryValue),
      ])
    );
  }

  return value;
}

function normalizeRecords(
  evaluationKind: PerformanceEvaluationDraftKind,
  records: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return records.map((record, index) => {
    const normalized = normalizeScalar(record) as Record<string, unknown>;

    return {
      submissionNumber: index + 1,
      evaluationKind,
      ...normalized,
    };
  });
}

function buildSnapshotHash(records: Array<Record<string, unknown>>): string {
  return createHash('sha256').update(JSON.stringify(records)).digest('hex');
}

function extractSentimentDistribution(summaryMarkdown: string): Record<string, number> | null {
  const positive = summaryMarkdown.match(/Positive \((\d+)%\)/i);
  const neutral = summaryMarkdown.match(/Neutral \((\d+)%\)/i);
  const negative = summaryMarkdown.match(/Negative \((\d+)%\)/i);

  if (!positive || !neutral || !negative) {
    return null;
  }

  return {
    positive: Number(positive[1]),
    neutral: Number(neutral[1]),
    negative: Number(negative[1]),
  };
}

async function loadSummarySource(
  supabaseAdmin: SupabaseClientLike,
  evaluationKind: PerformanceEvaluationDraftKind,
  periodKey: string
): Promise<SummarySource> {
  const config = SUMMARY_SOURCE_CONFIG[evaluationKind];
  const { data, error } = await supabaseAdmin
    .from(config.table)
    .select(config.selectColumns)
    .eq(config.periodColumn, periodKey)
    .is('deleted_at', null)
    .order('submitted_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load ${SUMMARY_KIND_LABELS[evaluationKind]} source data: ${error.message}`);
  }

  const normalizedRecords = normalizeRecords(
    evaluationKind,
    ((data as Array<Record<string, unknown>> | null) ?? []).map((record) => ({ ...record }))
  );

  return {
    records: normalizedRecords,
    snapshotHash: buildSnapshotHash(normalizedRecords),
  };
}

function mapSummaryRow(
  row: SummaryRow,
  isStale: boolean
): PerformanceEvaluationSummaryRecord {
  return {
    evaluationKind: row.evaluation_kind,
    periodKey: row.period_key,
    summaryMarkdown: row.summary_markdown,
    totalSubmissionsAnalyzed: row.total_submissions_analyzed,
    sentimentDistribution: row.sentiment_distribution,
    sourceSnapshotHash: row.source_snapshot_hash,
    generatedAt: row.generated_at,
    generatedBy: row.generated_by,
    isStale,
  };
}

async function loadStoredSummary(
  supabaseAdmin: SupabaseClientLike,
  evaluationKind: PerformanceEvaluationDraftKind,
  periodKey: string
): Promise<SummaryRow | null> {
  const { data, error } = await supabaseAdmin
    .from(SUMMARY_TABLE)
    .select(
      'evaluation_kind, period_key, summary_markdown, total_submissions_analyzed, sentiment_distribution, source_snapshot_hash, generated_at, generated_by, created_at, updated_at'
    )
    .eq('evaluation_kind', evaluationKind)
    .eq('period_key', periodKey)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load stored summary: ${error.message}`);
  }

  return (data as SummaryRow | null) ?? null;
}

function buildSummaryPrompt(
  evaluationKind: PerformanceEvaluationDraftKind,
  periodKey: string,
  records: Array<Record<string, unknown>>
): string {
  return [
    'You are an expert Data Analyst and Production-Ready AI Summarization Engine.',
    `Evaluation form type: ${SUMMARY_KIND_LABELS[evaluationKind]}.`,
    `Reporting period: ${formatPeriodLabel(evaluationKind, periodKey)}.`,
    `Total submissions analyzed: ${records.length}.`,
    'All source data is anonymized. Do not infer identities or add data that is not present.',
    'You must follow this markdown schema exactly:',
    '## Executive Form Summary',
    '**Total Submissions Analyzed:** [Insert Count]',
    '**Analysis Timestamp:** [Insert Date/Time]',
    '',
    '### 1. Key Takeaways & Recurring Themes',
    '* **[Theme 1 Title]:** Brief explanation of what users are saying, backed by a generalized synthesis of quotes or data.',
    '* **[Theme 2 Title]:** Brief explanation of the second most common pattern.',
    '',
    '### 2. Sentiment Analytics',
    '* 🟢 **Positive (X%):** Summary of positive feedback highlights.',
    '* 🟡 **Neutral (Y%):** Summary of passive or neutral feedback.',
    '* 🔴 **Negative (Z%):** Critical issues or blockers raised by users.',
    '',
    '### 3. Critical Outliers & Edge Cases',
    '> **Notable Feedback:** "[Insert a synthesized or directly quoted high-impact piece of unique user feedback]" — *Context/Impact*',
    '',
    '### 4. Recommended Actions',
    '1. **Immediate Fix:** [Action item derived from high-frequency complaints]',
    '2. **Strategic Adjustments:** [Long-term roadmap suggestion based on user desires]',
    '3. **Operational Follow-through:** [Action item grounded in the evidence]',
    '',
    'Guardrails:',
    '- Do not include any introductory prose before the H2 heading.',
    '- Do not fabricate counts, percentages, or themes; estimate sentiment only from the provided submissions.',
    '- Keep the tone objective and professional.',
    '- Strip or avoid any PII.',
    '',
    'Anonymized submissions JSON:',
    JSON.stringify(records),
  ].join('\n');
}

async function generateSummaryMarkdown(
  evaluationKind: PerformanceEvaluationDraftKind,
  periodKey: string,
  records: Array<Record<string, unknown>>
): Promise<string> {
  const response = await chat(
    [
      {
        role: 'user',
        content: buildSummaryPrompt(evaluationKind, periodKey, records),
      },
    ],
    [],
    {
      temperature: 0.2,
      maxTokens: 1600,
      systemPrompt:
        'You generate concise executive summaries for evaluation forms. Follow the requested markdown schema exactly and do not include extra framing text.',
    }
  );

  return response.message.trim();
}

export async function getPerformanceEvaluationSummary(
  supabaseAdmin: SupabaseClientLike,
  evaluationKind: PerformanceEvaluationDraftKind,
  periodKey: string
): Promise<PerformanceEvaluationSummaryLookupResult> {
  const [storedSummary, source] = await Promise.all([
    loadStoredSummary(supabaseAdmin, evaluationKind, periodKey),
    loadSummarySource(supabaseAdmin, evaluationKind, periodKey),
  ]);

  if (!storedSummary) {
    return {
      summary: null,
      totalSubmissionsAnalyzed: source.records.length,
      hasSourceData: source.records.length > 0,
    };
  }

  return {
    summary: mapSummaryRow(storedSummary, storedSummary.source_snapshot_hash !== source.snapshotHash),
    totalSubmissionsAnalyzed: source.records.length,
    hasSourceData: source.records.length > 0,
  };
}

export async function generatePerformanceEvaluationSummary(
  supabaseAdmin: SupabaseClientLike,
  userId: string,
  input: GeneratePerformanceEvaluationSummaryInput
): Promise<PerformanceEvaluationSummaryRecord> {
  const source = await loadSummarySource(supabaseAdmin, input.evaluationKind, input.periodKey);

  if (source.records.length === 0) {
    throw new Error('No submitted evaluations are available for this period yet.');
  }

  const existing = await loadStoredSummary(supabaseAdmin, input.evaluationKind, input.periodKey);
  if (
    existing &&
    existing.source_snapshot_hash === source.snapshotHash &&
    !input.forceRegenerate
  ) {
    return mapSummaryRow(existing, false);
  }

  const summaryMarkdown = await generateSummaryMarkdown(
    input.evaluationKind,
    input.periodKey,
    source.records
  );

  const timestamp = new Date().toISOString();
  const sentimentDistribution = extractSentimentDistribution(summaryMarkdown);

  const { data, error } = await supabaseAdmin
    .from(SUMMARY_TABLE)
    .upsert(
      {
        evaluation_kind: input.evaluationKind,
        period_key: input.periodKey,
        summary_markdown: summaryMarkdown,
        total_submissions_analyzed: source.records.length,
        sentiment_distribution: sentimentDistribution,
        source_snapshot_hash: source.snapshotHash,
        generated_at: timestamp,
        generated_by: userId,
        created_by: userId,
        updated_at: timestamp,
      },
      {
        onConflict: 'evaluation_kind,period_key',
      }
    )
    .select(
      'evaluation_kind, period_key, summary_markdown, total_submissions_analyzed, sentiment_distribution, source_snapshot_hash, generated_at, generated_by, created_at, updated_at'
    )
    .single();

  if (error || !data) {
    throw new Error(`Failed to store generated summary: ${error?.message ?? 'Unknown error'}`);
  }

  return mapSummaryRow(data as SummaryRow, false);
}