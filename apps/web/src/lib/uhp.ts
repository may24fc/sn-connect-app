export const UHP_MODULE_VALUES = ['client_tracker', 'portal_reminders', 'volume_points'] as const;
export type UhpModule = (typeof UHP_MODULE_VALUES)[number];

export const UHP_CLIENT_STATUS_VALUES = [
  'Prospect',
  'WE Presented',
  'WE form Filled',
  '5DC',
  '20DP',
  'Cold lead',
  'Warm lead',
  'TR/Friend',
  'Not Interested',
  'Client (Active)',
] as const;

export const UHP_CLIENT_TYPE_VALUES = [
  'Retail',
  'Recruitment',
  'Accountability Partner',
  'UHP Founders Health Audit',
  'Member',
  'Client',
] as const;

/** Always offered in the Source dropdown; sources added by users are merged in after these. */
export const UHP_CLIENT_SOURCE_DEFAULTS = [
  'Instagram',
  'Facebook',
  'LinkedIn',
  'TikTok',
  'Referral',
  'Website',
  'Event',
] as const;

/** Defaults first, then other sources in alphabetical order, deduplicated case-insensitively. */
export function mergeUhpSourceOptions(sources: ReadonlyArray<string | null>): Array<string> {
  const seen = new Set<string>();
  const merged: Array<string> = [];
  const add = (value: string | null) => {
    const source = value?.trim().replace(/\s+/g, ' ');
    if (!source || seen.has(source.toLowerCase())) return;
    seen.add(source.toLowerCase());
    merged.push(source);
  };
  UHP_CLIENT_SOURCE_DEFAULTS.forEach(add);
  [...sources]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right))
    .forEach(add);
  return merged;
}

/** Accepts "instagram.com/name" as well as full URLs; returns null for blank input. */
export function normalizeUhpLink(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Mirrors the API rule: an http(s) URL with a hostname. */
export function isUhpWebLink(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

/** Short label for a link, e.g. "instagram.com". */
export function uhpLinkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export type UhpClientContact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

// Compare the last 9 digits so "0405 536 369", "405536369", and "+61 405 536 369" match.
function phoneKey(value: string | null): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length >= 7 ? digits.slice(-9) : null;
}

export function findUhpDuplicateClients(
  candidate: Omit<UhpClientContact, 'id'>,
  existing: Array<UhpClientContact>
): Array<UhpClientContact> {
  const name = normalizeName(candidate.name);
  const email = candidate.email?.trim().toLowerCase() || null;
  const phone = phoneKey(candidate.phone);
  return existing.filter(
    (client) =>
      normalizeName(client.name) === name ||
      (email !== null && client.email?.trim().toLowerCase() === email) ||
      (phone !== null && phoneKey(client.phone) === phone)
  );
}

export const UHP_ATTACHMENTS_BUCKET = 'uhp-client-attachments';
export const UHP_ATTACHMENT_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const UHP_ATTACHMENT_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export function isUhpAttachmentMimeType(
  value: string
): value is (typeof UHP_ATTACHMENT_MIME_TYPES)[number] {
  return (UHP_ATTACHMENT_MIME_TYPES as ReadonlyArray<string>).includes(value);
}

export type UhpOutreachActivityRow = {
  client_id: string | null;
  direction: string | null;
  reply_received: boolean;
  prospect_outcome: string | null;
  appointment_type: string | null;
  /** The client's current state, embedded by fetchUhpOutreachRows. */
  client?: { interest_state: string; replied: boolean } | null;
};

export type UhpOutreachSummary = {
  clientsReachedOut: number;
  outreachAttempts: number;
  clientsReplied: number;
  responseRate: number;
  interested: number;
  declined: number;
  noResponse: number;
  wellnessEvaluationsScheduled: number;
  callsScheduled: number;
  newClients: number;
};

/**
 * People-based summary: each client counts once regardless of how many messages were logged.
 *
 * - Manual Replied toggles are supplied as timestamp-filtered synthetic reply rows. The current
 *   client boolean must not make an older reply leak into the selected period.
 * - Interested / declined count clients whose outcome was recorded in the period and is still
 *   their current interest, so a client who changed their mind is counted once, as they stand.
 */
export function summarizeUhpOutreach(
  rows: Array<UhpOutreachActivityRow>,
  newClients: number
): UhpOutreachSummary {
  const clientsWhere = (predicate: (row: UhpOutreachActivityRow) => boolean) =>
    new Set(rows.filter((row) => row.client_id && predicate(row)).map((row) => row.client_id));
  const reachedOut = clientsWhere((row) => row.direction === 'outbound');
  const replied = clientsWhere((row) => row.reply_received || row.direction === 'inbound');
  const outcomeStillCurrent = (row: UhpOutreachActivityRow, outcome: 'interested' | 'declined') =>
    row.prospect_outcome === outcome && (!row.client || row.client.interest_state === outcome);
  const declined = clientsWhere((row) => outcomeStillCurrent(row, 'declined'));
  const repliedAfterOutreach = [...reachedOut].filter((id) => replied.has(id)).length;
  const noResponse = [...reachedOut].filter((id) => !(replied.has(id) || declined.has(id))).length;

  return {
    clientsReachedOut: reachedOut.size,
    outreachAttempts: rows.filter((row) => row.direction === 'outbound').length,
    clientsReplied: replied.size,
    responseRate: reachedOut.size
      ? Math.round((repliedAfterOutreach / reachedOut.size) * 1000) / 10
      : 0,
    interested: clientsWhere((row) => outcomeStillCurrent(row, 'interested')).size,
    declined: declined.size,
    noResponse,
    wellnessEvaluationsScheduled: rows.filter(
      (row) => row.appointment_type === 'wellness_evaluation'
    ).length,
    callsScheduled: rows.filter((row) => row.appointment_type === 'call').length,
    newClients,
  };
}

export const UHP_ACTIVITY_TYPE_VALUES = [
  'Task',
  'Interaction',
  'Discovery Call',
  'WE Presentation',
  'Catch up Call',
] as const;

/** Appointment pre-selected when logging these activity types; the user can still change it. */
export const UHP_ACTIVITY_APPOINTMENT_TYPES: Partial<
  Record<(typeof UHP_ACTIVITY_TYPE_VALUES)[number], 'wellness_evaluation' | 'call'>
> = {
  'WE Presentation': 'wellness_evaluation',
  'Discovery Call': 'call',
  'Catch up Call': 'call',
};

export const UHP_VP_CATEGORY_VALUES = [
  'personal',
  'repeat_customer',
  'new_client',
  'old_client',
  'distributor',
] as const;
export type UhpVpCategory = (typeof UHP_VP_CATEGORY_VALUES)[number];

export const UHP_VP_CATEGORY_LABELS: Record<UhpVpCategory, string> = {
  personal: 'ROOF / Personal',
  repeat_customer: 'Repeat Customers',
  new_client: 'New Clients',
  old_client: 'Old Clients',
  distributor: 'Distributor',
};

export const UHP_REMINDER_TYPES = [
  'ten_customer_form',
  'checks_deposits',
  'ro_group_report',
] as const;
export type UhpReminderType = (typeof UHP_REMINDER_TYPES)[number];

export const UHP_REMINDER_LABELS: Record<UhpReminderType, string> = {
  ten_customer_form: '10-customer form',
  checks_deposits: 'Checks and deposits',
  ro_group_report: 'RO group report',
};
