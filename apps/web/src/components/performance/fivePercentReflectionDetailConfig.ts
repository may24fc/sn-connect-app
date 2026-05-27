export type FivePercentReflectionRecord = {
  id: string;
  user_id?: string;
  month_key: string;
  full_name: string;
  department_role: string;
  work_feelings: string;
  work_headline: string;
  work_significance: string;
  work_rank: number;
  work_action: string;
  family_feelings: string;
  family_headline: string;
  family_significance: string;
  family_rank: number;
  family_action: string;
  personal_feelings: string;
  personal_headline: string;
  personal_significance: string;
  personal_rank: number;
  personal_action: string;
  deep_dive_parking_lot: string;
  exploration_topics: string;
  submitted_at: string;
};

export type FivePercentReflectionAdminListEntry = {
  id: string;
  user_id: string;
  employee_id: string | null;
  full_name: string;
  department_role: string;
  avatar_url: string | null;
  submission_status: 'pending' | 'submitted';
  submitted_at: string | null;
  average_rank: number | null;
  submission: FivePercentReflectionRecord | null;
};

export type FivePercentReflectionDetailField = {
  label: string;
  value: (record: FivePercentReflectionRecord) => string;
  fullWidth?: boolean;
  preserveWhitespace?: boolean;
  emphasizeValue?: boolean;
};

export type FivePercentReflectionDetailSection = {
  title: string;
  description: string;
  fields: FivePercentReflectionDetailField[];
};

export function getFivePercentAverageRank(record: FivePercentReflectionRecord): number {
  return Math.round(((record.work_rank + record.family_rank + record.personal_rank) / 3) * 10) / 10;
}

export const fivePercentReflectionDetailSections: FivePercentReflectionDetailSection[] = [
  {
    title: 'SECTION 1: WORK',
    description:
      'Monthly work reflection focused on feelings, causes, significance, rank, and next action.',
    fields: [
      {
        label: 'Feelings (Work)',
        value: (record) => record.work_feelings,
      },
      {
        label: 'Headline (Work)',
        value: (record) => record.work_headline,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: 'Significance (5%) (Work)',
        value: (record) => record.work_significance,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: 'Rank (Work)',
        value: (record) => `${record.work_rank} / 10`,
        emphasizeValue: true,
      },
      {
        label: 'Action (Work)',
        value: (record) => record.work_action,
        fullWidth: true,
        preserveWhitespace: true,
      },
    ],
  },
  {
    title: 'SECTION 2: FAMILY',
    description: 'Monthly family reflection using the same prompts as the work section.',
    fields: [
      {
        label: 'Feelings (Family)',
        value: (record) => record.family_feelings,
      },
      {
        label: 'Headline (Family)',
        value: (record) => record.family_headline,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: 'Significance (5%) (Family)',
        value: (record) => record.family_significance,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: 'Rank (Family)',
        value: (record) => `${record.family_rank} / 10`,
        emphasizeValue: true,
      },
      {
        label: 'Action (Family)',
        value: (record) => record.family_action,
        fullWidth: true,
        preserveWhitespace: true,
      },
    ],
  },
  {
    title: 'SECTION 3: PERSONAL',
    description:
      'Monthly personal reflection using the same prompts as the work and family sections.',
    fields: [
      {
        label: 'Feelings (Personal)',
        value: (record) => record.personal_feelings,
      },
      {
        label: 'Headline (Personal)',
        value: (record) => record.personal_headline,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: 'Significance (5%) (Personal)',
        value: (record) => record.personal_significance,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label: 'Rank (Personal)',
        value: (record) => `${record.personal_rank} / 10`,
        emphasizeValue: true,
      },
      {
        label: 'Action (Personal)',
        value: (record) => record.personal_action,
        fullWidth: true,
        preserveWhitespace: true,
      },
    ],
  },
  {
    title: 'TOPICS TO HELP ME LEARN & MAKE BETTER DECISIONS',
    description:
      'Parking-lot topics and exploration prompts to guide the next deeper reflection cycle.',
    fields: [
      {
        label:
          'The important/undecided emotionally complex topics I would like to add to my Deep Dive parking lot ("why" topics)',
        value: (record) => record.deep_dive_parking_lot,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label:
          'Topics I would like to explore to help me learn and make better decisions (the "what" and "how")',
        value: (record) => record.exploration_topics,
        fullWidth: true,
        preserveWhitespace: true,
      },
    ],
  },
];
