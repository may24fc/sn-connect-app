/**
 * Shared formatting utilities for consistent UI display across all tables and views.
 */

const LABEL_TOKEN_MAP: Record<string, string> = {
  ai: 'AI',
  api: 'API',
  ceo: 'CEO',
  cos: 'CoS',
  hr: 'HR',
  id: 'ID',
  kpi: 'KPI',
  kpis: 'KPIs',
  okr: 'OKR',
  okrs: 'OKRs',
  ui: 'UI',
  ux: 'UX',
};

function formatLabelToken(token: string): string {
  const normalizedToken = token.toLowerCase();
  const mappedToken = LABEL_TOKEN_MAP[normalizedToken];

  if (mappedToken) {
    return mappedToken;
  }

  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/**
 * Converts a snake_case or lowercase database value to a human-friendly Title Case label.
 * e.g. "in_progress" → "In Progress", "pending" → "Pending", "approved" → "Approved"
 */
export function formatLabel(value: string | null | undefined): string {
  if (!value) return '—';

  return value
    .trim()
    .replace(/_/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => formatLabelToken(token))
    .join(' ');
}

/**
 * Formats an ISO date string to a localized, human-readable date.
 * e.g. "2026-02-28" → "Feb 28, 2026"
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Formats an ISO datetime string to a localized, human-readable date and time.
 * e.g. "2026-02-28T14:30:00Z" → "Feb 28, 2026, 2:30 PM"
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Formats a date range (period_start to period_end).
 * e.g. "Feb 1 – Feb 28, 2026"
 */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  if (!start || !end) return '—';
  const startDate = formatDate(start);
  const endDate = formatDate(end);
  return `${startDate} – ${endDate}`;
}
