export type MonthlySelfEvaluationRecord = {
  id: string;
  user_id?: string;
  month_key: string;
  full_name: string;
  department_role: string;
  top_three_things_worked_on: string;
  biggest_impact: string;
  impact_reason: string;
  significant_achievement: string;
  challenge_resolved: string;
  monthly_improvement: string;
  work_slowdown: string;
  unseen_workflow_issue: string;
  requested_support: string;
  productivity_score: number;
  productivity_reason: string;
  ownership_outside_role: string;
  professional_improvement_area: string;
  next_skill_to_learn: string;
  leadership_did_well: string;
  leadership_can_improve: string;
  contributions_visible: 'yes' | 'sometimes' | 'no';
  comfortable_raising_concerns: 'yes' | 'sometimes' | 'no';
  hidden_productivity_issue: string;
  immediate_improvement: string;
  additional_comments: string | null;
  next_month_goal: string;
  submitted_at: string;
  updated_at: string;
};

export type MonthlySelfEvaluationAdminListEntry = {
  id: string;
  user_id: string;
  employee_id: string | null;
  full_name: string;
  department_role: string;
  avatar_url: string | null;
  submission_status: 'pending' | 'submitted';
  submitted_at: string | null;
  last_employee_edit_at: string | null;
  has_employee_edits: boolean;
  productivity_score: number | null;
  submission: MonthlySelfEvaluationRecord | null;
};

export type MonthlySelfEvaluationDetailField = {
  label: string;
  value: (record: MonthlySelfEvaluationRecord) => string;
  fullWidth?: boolean;
  preserveWhitespace?: boolean;
  emphasizeValue?: boolean;
};

export type MonthlySelfEvaluationDetailSection = {
  title: string;
  description: string;
  fields: MonthlySelfEvaluationDetailField[];
};

function capitalizeResponse(value: 'yes' | 'sometimes' | 'no'): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const monthlySelfEvaluationDetailSections: MonthlySelfEvaluationDetailSection[] = [
  {
    title: 'SECTION 1: ROLE & WORK SUMMARY',
    description:
      'Submitted role details, work summary, blockers, and requested support for the month.',
    fields: [
      {
        label: '1. Full Name',
        value: (record) => record.full_name,
      },
      {
        label: '2. Department / Role',
        value: (record) => record.department_role,
      },
      {
        label: '3. What were the top 3 things you worked on this month?',
        value: (record) => record.top_three_things_worked_on,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '4. Which task, contribution, campaign, project, or initiative created the biggest impact this month?',
        value: (record) => record.biggest_impact,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '5. Why do you think this work mattered?',
        value: (record) => record.impact_reason,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '6. Did you complete, improve, launch, automate, organize, or solve anything significant this month?',
        value: (record) => record.significant_achievement,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '7. What challenge, issue, or blocker did you help resolve?',
        value: (record) => record.challenge_resolved,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '8. What is one thing you improved this month compared to last month?',
        value: (record) => record.monthly_improvement,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '9. What slowed you down or made your work more difficult this month?',
        value: (record) => record.work_slowdown,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '10. Is there any workflow, communication issue, inefficiency, or recurring problem leadership may not be fully seeing?',
        value: (record) => record.unseen_workflow_issue,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '11. What support, tool, resource, or improvement would help you perform better?',
        value: (record) => record.requested_support,
        fullWidth: true,
        preserveWhitespace: true,
      },
    ],
  },
  {
    title: 'SECTION 2: OWNERSHIP & PRODUCTIVITY',
    description:
      'Submitted productivity score and reflection on ownership, professional growth, and the next capability to build.',
    fields: [
      {
        label: '12. On a scale of 1-10, how productive do you believe you were this month?',
        value: (record) => `${record.productivity_score} / 10`,
        emphasizeValue: true,
      },
      {
        label: '13. What made you give yourself that score?',
        value: (record) => record.productivity_reason,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '14. Did you proactively take ownership of anything outside your direct responsibilities?',
        value: (record) => record.ownership_outside_role,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '15. What is one area you believe you still need to improve professionally?',
        value: (record) => record.professional_improvement_area,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '16. What skill, system, or knowledge would you like to improve or learn next?',
        value: (record) => record.next_skill_to_learn,
        fullWidth: true,
        preserveWhitespace: true,
      },
    ],
  },
  {
    title: 'SECTION 3: LEADERSHIP & OPERATIONS FEEDBACK',
    description:
      'Submitted feedback on management, communication, visibility, and operational issues affecting work.',
    fields: [
      {
        label: '17. What is one thing leadership or management did well this month?',
        value: (record) => record.leadership_did_well,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '18. What is one thing leadership or management can improve?',
        value: (record) => record.leadership_can_improve,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '19. Do you feel your work and contributions are visible and understood?',
        value: (record) => capitalizeResponse(record.contributions_visible),
      },
      {
        label: '20. Do you feel comfortable raising concerns, blockers, or ideas?',
        value: (record) => capitalizeResponse(record.comfortable_raising_concerns),
      },
      {
        label: '21. Is there anything leadership may not realize is negatively affecting productivity, morale, communication, or operations?',
        value: (record) => record.hidden_productivity_issue,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '22. If you could improve one thing immediately within the company, workflow, systems, or operations, what would it be?',
        value: (record) => record.immediate_improvement,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: '23. Any additional comments, concerns, suggestions, or reflections?',
        value: (record) => record.additional_comments || 'None provided',
        fullWidth: true,
        preserveWhitespace: true,
      },
    ],
  },
  {
    title: 'FINAL REFLECTION',
    description: 'Submitted final priority for the next month.',
    fields: [
      {
        label: '24. What is one thing you want to accomplish or improve next month?',
        value: (record) => record.next_month_goal,
        fullWidth: true,
        preserveWhitespace: true,
      },
    ],
  },
];
