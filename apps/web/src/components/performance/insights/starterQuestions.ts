export const REFLECTION_STARTER_QUESTIONS = [
  "Who hasn't submitted this month?",
  'Whose family rank dropped the most compared with last month?',
  'What are the most common themes in work headlines this month?',
  'Which topics do people most want to explore next?',
  'Who might benefit from a supportive check-in, and why?',
] as const;

export function formatInsightMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!(year && month)) return monthKey;

  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatInsightWindow(periodKey: string, monthsBack: number): string {
  const month = formatInsightMonth(periodKey);
  if (monthsBack === 0) return month;
  return `${month} · +${monthsBack} prior month${monthsBack === 1 ? '' : 's'}`;
}
