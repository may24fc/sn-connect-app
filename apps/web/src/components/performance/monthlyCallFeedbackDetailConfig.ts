const CALL_LENGTH_LABELS = {
  too_long: 'Too long',
  just_right: 'Just right',
  too_short: 'Too short',
} as const;

const CLARITY_LABELS = {
  very_clear: 'Very Clear',
  clear: 'Clear',
  neutral: 'Neutral',
  not_clear: 'Not Clear',
} as const;

const ENGAGEMENT_LABELS = {
  1: '1 / 4',
  2: '2 / 4',
  3: '3 / 4',
  4: '4 / 4',
} as const;

const OVERALL_RATING_LABELS = {
  1: '1 / 4',
  2: '2 / 4',
  3: '3 / 4',
  4: '4 / 4',
} as const;

export type MonthlyCallFeedbackRecord = {
  id: string;
  user_id?: string;
  month_key: string;
  full_name: string;
  department_role: string;
  engagement_level: 1 | 2 | 3 | 4;
  engagement_reason: string;
  valuable_parts: string[];
  valuable_parts_reason: string;
  call_length: keyof typeof CALL_LENGTH_LABELS;
  clarity_financial_growth_discussion: keyof typeof CLARITY_LABELS;
  clarity_icebreaker_conversation_starters: keyof typeof CLARITY_LABELS;
  clarity_five_percent_reflection_worksheet: keyof typeof CLARITY_LABELS;
  overall_rating: 1 | 2 | 3 | 4;
  key_takeaway: string;
  future_improvements: string;
  next_topics: string;
  submitted_at: string;
  updated_at: string;
};

export type MonthlyCallFeedbackAdminListEntry = {
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
  engagement_level: number | null;
  overall_rating: number | null;
  submission: MonthlyCallFeedbackRecord | null;
};

export type MonthlyCallFeedbackDetailField = {
  label: string;
  value: (record: MonthlyCallFeedbackRecord) => string;
  fullWidth?: boolean;
  preserveWhitespace?: boolean;
  emphasizeValue?: boolean;
};

export type MonthlyCallFeedbackDetailSection = {
  title: string;
  description: string;
  fields: MonthlyCallFeedbackDetailField[];
};

export function formatMonthlyCallEngagement(level: number): string {
  return ENGAGEMENT_LABELS[level as keyof typeof ENGAGEMENT_LABELS] ?? `${level} / 4`;
}

export function formatMonthlyCallOverallRating(level: number): string {
  return OVERALL_RATING_LABELS[level as keyof typeof OVERALL_RATING_LABELS] ?? `${level} / 4`;
}

export function formatMonthlyCallLength(value: string): string {
  return CALL_LENGTH_LABELS[value as keyof typeof CALL_LENGTH_LABELS] ?? value;
}

export function formatMonthlyCallClarity(value: string): string {
  return CLARITY_LABELS[value as keyof typeof CLARITY_LABELS] ?? value;
}

export const monthlyCallFeedbackDetailSections: MonthlyCallFeedbackDetailSection[] = [
  {
    title: 'SECTION 1: ENGAGEMENT & VALUE',
    description: 'How the teammate experienced the call and what drove that feeling.',
    fields: [
      {
        label: '1. How engaging or valuable did you find this month\'s monthly call?',
        value: (record) => formatMonthlyCallEngagement(record.engagement_level),
        emphasizeValue: true,
      },
      {
        label: 'What made you feel this way?',
        value: (record) => record.engagement_reason,
        fullWidth: true,
        preserveWhitespace: true,
      },
    ],
  },
  {
    title: 'SECTION 2: CONTENT BREAKDOWN',
    description: 'Which parts of the call felt most valuable and why.',
    fields: [
      {
        label: '2. Which parts of the call did you find most valuable?',
        value: (record) => record.valuable_parts.join(', '),
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: 'What made you choose your selections?',
        value: (record) => record.valuable_parts_reason,
        fullWidth: true,
        preserveWhitespace: true,
      },
    ],
  },
  {
    title: 'SECTION 3: CALL MECHANICS & CLARITY',
    description: 'How the call length and the clarity of each section were experienced.',
    fields: [
      {
        label: '3. How would you describe the length of the monthly call?',
        value: (record) => formatMonthlyCallLength(record.call_length),
      },
      {
        label: 'Financial Growth Discussion clarity',
        value: (record) => formatMonthlyCallClarity(record.clarity_financial_growth_discussion),
      },
      {
        label: 'Icebreaker / Conversation Starters clarity',
        value: (record) => formatMonthlyCallClarity(record.clarity_icebreaker_conversation_starters),
      },
      {
        label: '5% Reflection Worksheet clarity',
        value: (record) => formatMonthlyCallClarity(record.clarity_five_percent_reflection_worksheet),
      },
    ],
  },
  {
    title: 'SECTION 4: OVERALL RATING & TAKEAWAYS',
    description: 'Overall rating plus the most useful qualitative feedback for future calls.',
    fields: [
      {
        label: '4. Overall rating for this monthly call',
        value: (record) => formatMonthlyCallOverallRating(record.overall_rating),
        emphasizeValue: true,
      },
      {
        label: 'What is your key takeaway from this month\'s session?',
        value: (record) => record.key_takeaway,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: 'What can improve in future monthly call sessions?',
        value: (record) => record.future_improvements,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: 'What topics would you like us to cover next time?',
        value: (record) => record.next_topics,
        fullWidth: true,
        preserveWhitespace: true,
      },
    ],
  },
];