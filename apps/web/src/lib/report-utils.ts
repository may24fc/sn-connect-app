/**
 * Shared report type info, labels, and utilities used across all report pages.
 */

export const REPORT_TYPE_INFO: Record<string, { label: string; description: string; icon: string }> = {
  weekly: {
    label: 'Weekly',
    description: 'Summarize your weekly activities, accomplishments, and plans for next week.',
    icon: '📅',
  },
  monthly: {
    label: 'Monthly',
    description: 'Provide a comprehensive overview of the month including key metrics and milestones.',
    icon: '📊',
  },
  marketing: {
    label: 'Marketing',
    description: 'Track campaign performance metrics like clicks, impressions, conversions, and costs.',
    icon: '📈',
  },
};

/** Get a human-readable label for a report type, falling back to title case */
export function getReportTypeLabel(reportType: string): string {
  return REPORT_TYPE_INFO[reportType]?.label ?? reportType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Get the description for a report type */
export function getReportTypeDescription(reportType: string): string | undefined {
  return REPORT_TYPE_INFO[reportType]?.description;
}

/**
 * Parse structured sections from report notes.
 * Supports sections marked with headers like "Accomplishments:", "Challenges:", "Next Week Plans:"
 */
export function parseNoteSections(notes: string): {
  summary: string;
  accomplishments: Array<string>;
  challenges: Array<string>;
  nextWeekPlans: Array<string>;
} {
  const result = {
    summary: '',
    accomplishments: [] as Array<string>,
    challenges: [] as Array<string>,
    nextWeekPlans: [] as Array<string>,
  };

  if (!notes) return result;

  const sections = notes.split(/\n(?=(?:accomplishments|challenges|next\s*week\s*plans):)/i);

  for (const section of sections) {
    const trimmed = section.trim();
    if (/^accomplishments:/i.test(trimmed)) {
      result.accomplishments = parseListItems(trimmed.replace(/^accomplishments:\s*/i, ''));
    } else if (/^challenges:/i.test(trimmed)) {
      result.challenges = parseListItems(trimmed.replace(/^challenges:\s*/i, ''));
    } else if (/^next\s*week\s*plans:/i.test(trimmed)) {
      result.nextWeekPlans = parseListItems(trimmed.replace(/^next\s*week\s*plans:\s*/i, ''));
    } else if (!result.summary) {
      result.summary = trimmed;
    }
  }

  if (!result.summary && result.accomplishments.length === 0) {
    result.summary = notes;
  }

  return result;
}

function parseListItems(text: string): Array<string> {
  return text
    .split(/\n/)
    .map((line) => line.replace(/^[-*\u2022]\s*/, '').trim())
    .filter(Boolean);
}
