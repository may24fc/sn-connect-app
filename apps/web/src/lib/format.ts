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

function formatPersonNameToken(token: string): string {
  return token
    .split(/(['’-])/)
    .map((segment) => {
      if (segment === '' || segment === "'" || segment === '’' || segment === '-') {
        return segment;
      }

      return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
    })
    .join('');
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
 * Formats a person's full name in capital case while preserving apostrophes and hyphens.
 * e.g. "ava castillo" → "Ava Castillo", "anne-marie o'neal" → "Anne-Marie O'Neal"
 */
export function formatPersonName(value: string | null | undefined): string {
  if (!value) return '—';

  return value
    .trim()
    .replace(/_/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => formatPersonNameToken(token))
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

/** Formats a Finance date consistently as `30 Oct 2026`. */
export function formatFinanceDate(value: string | null | undefined): string {
  if (!value) return '—';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: dateOnly ? 'UTC' : undefined,
  }).format(date);
}

/**
 * Formats a Finance `YYYY-MM-DD` period, collapsing the parts both ends share:
 * `16 Oct 2026`, `1–15 Oct 2026`, `16 Oct – 3 Nov 2026`, `28 Dec 2026 – 3 Jan 2027`.
 */
export function formatFinanceDateRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  const isDateOnly = (value: string | null | undefined): value is string =>
    !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!start || !end) return '—';
  if (!(isDateOnly(start) && isDateOnly(end)) || end < start) {
    return `${formatFinanceDate(start)} – ${formatFinanceDate(end)}`;
  }
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatRange(new Date(`${start}T00:00:00Z`), new Date(`${end}T00:00:00Z`));
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
