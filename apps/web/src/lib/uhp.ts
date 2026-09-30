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

/** People-based weekly summary: each client counts once regardless of how many messages were logged. */
export function summarizeUhpOutreach(
  rows: Array<UhpOutreachActivityRow>,
  newClients: number
): UhpOutreachSummary {
  const clientsWhere = (predicate: (row: UhpOutreachActivityRow) => boolean) =>
    new Set(rows.filter((row) => row.client_id && predicate(row)).map((row) => row.client_id));
  const reachedOut = clientsWhere((row) => row.direction === 'outbound');
  const replied = clientsWhere((row) => row.reply_received || row.direction === 'inbound');
  const declined = clientsWhere((row) => row.prospect_outcome === 'declined');
  const repliedAfterOutreach = [...reachedOut].filter((id) => replied.has(id)).length;
  const noResponse = [...reachedOut].filter((id) => !(replied.has(id) || declined.has(id))).length;

  return {
    clientsReachedOut: reachedOut.size,
    outreachAttempts: rows.filter((row) => row.direction === 'outbound').length,
    clientsReplied: replied.size,
    responseRate: reachedOut.size
      ? Math.round((repliedAfterOutreach / reachedOut.size) * 1000) / 10
      : 0,
    interested: clientsWhere((row) => row.prospect_outcome === 'interested').size,
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
