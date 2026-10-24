import type { PerformanceEvaluationDraftKind } from '@/lib/schemas/performance.schema';

/** Shared source definitions for AI features that read evaluation submissions. */

export const SUMMARY_KIND_LABELS: Record<PerformanceEvaluationDraftKind, string> = {
  monthly: 'Monthly Self-Evaluation',
  monthly_call_feedback: 'Monthly Call Feedback',
  five_percent: '5% Reflection',
  quarterly: 'Quarterly Temperature Check',
};

export const SUMMARY_SOURCE_CONFIG: Record<
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

export function formatPeriodLabel(
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

export function stripPotentialPii(value: string): string {
  // The email pattern backtracks quadratically on long runs without "@", so skip it when it cannot match.
  const withoutEmails = value.includes('@')
    ? value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    : value;
  return withoutEmails.replace(/\+?\d[\d()\-\s]{7,}\d/g, '[redacted-phone]').trim();
}
