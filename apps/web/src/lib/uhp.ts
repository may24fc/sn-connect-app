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

export const UHP_CLIENT_TYPE_VALUES = ['Retail', 'Recruitment', 'Accountability Partner'] as const;

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
