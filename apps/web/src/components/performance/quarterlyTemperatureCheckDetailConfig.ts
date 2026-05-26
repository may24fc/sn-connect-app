export type QuarterlyTemperatureCheckRecord = {
  id: string;
  quarter_key: string;
  full_name: string;
  department_role: string;
  energy_workload_score: number;
  energy_workload_reason: string;
  clarity_support: string;
  improvement_change: string;
  achievement_recognition: string;
  feedback_suggestions: string;
  overall_experience_score: number;
  overall_experience_reason: string;
  submitted_at: string;
};

export type QuarterlyTemperatureCheckDetailField = {
  label: string;
  value: (record: QuarterlyTemperatureCheckRecord) => string;
  fullWidth?: boolean;
  preserveWhitespace?: boolean;
  emphasizeValue?: boolean;
};

export type QuarterlyTemperatureCheckDetailSection = {
  title: string;
  description: string;
  fields: QuarterlyTemperatureCheckDetailField[];
};

export const quarterlyTemperatureCheckDetailSections: QuarterlyTemperatureCheckDetailSection[] = [
  {
    title: 'SECTION 1: ABOUT YOU',
    description:
      'Identity and role context for the quarterly temperature check submission.',
    fields: [
      {
        label: 'Full Name',
        value: (record) => record.full_name,
      },
      {
        label: 'Department / Role',
        value: (record) => record.department_role,
      },
    ],
  },
  {
    title: 'SECTION 2: ENERGY, CLARITY & SUPPORT',
    description:
      'Reflection on energy, workload balance, goal clarity, and the support received this quarter.',
    fields: [
      {
        label:
          '1. On a scale of 1-10, how was your overall energy and workload balance this quarter?',
        value: (record) => `${record.energy_workload_score} / 10`,
        emphasizeValue: true,
      },
      {
        label: 'What influenced your rating?',
        value: (record) => record.energy_workload_reason,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label:
          '2. Did you feel clear on your goals and supported by the team this quarter? What could be improved?',
        value: (record) => record.clarity_support,
        fullWidth: true,
        preserveWhitespace: true,
      },
    ],
  },
  {
    title: 'SECTION 3: IMPROVEMENTS, GROWTH & FEEDBACK',
    description:
      'Suggested improvements, achievements, recognition, and feedback that could improve team experience.',
    fields: [
      {
        label:
          '3. If you could change ONE thing about how we work (process, tools, communication, etc.), what would it be?',
        value: (record) => record.improvement_change,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label:
          "4. What's one achievement you're proud of this quarter, and is there anyone you'd like to recognize?",
        value: (record) => record.achievement_recognition,
        fullWidth: true,
        preserveWhitespace: true,
      },
      {
        label:
          '5. Do you have any feedback or suggestions that could help improve how we work or your experience in the team?',
        value: (record) => record.feedback_suggestions,
        fullWidth: true,
        preserveWhitespace: true,
      },
    ],
  },
  {
    title: 'SECTION 4: OVERALL EXPERIENCE',
    description:
      'Overall quarter sentiment and the strongest positives or stand-out moments from the quarter.',
    fields: [
      {
        label:
          '6. How would you describe your overall experience this quarter? (1 = Very Poor, 5 = Excellent)',
        value: (record) => `${record.overall_experience_score} / 5`,
        emphasizeValue: true,
      },
      {
        label: 'Why did you rate it this way, and what went well or stood out the most?',
        value: (record) => record.overall_experience_reason,
        fullWidth: true,
        preserveWhitespace: true,
      },
    ],
  },
];
