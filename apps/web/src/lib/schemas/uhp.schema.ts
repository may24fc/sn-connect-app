import {
  UHP_ACTIVITY_TYPE_VALUES,
  UHP_CLIENT_STATUS_VALUES,
  UHP_CLIENT_TYPE_VALUES,
  UHP_MODULE_VALUES,
  UHP_REMINDER_TYPES,
  UHP_VP_CATEGORY_VALUES,
} from '@/lib/uhp';
import { z } from 'zod';

const optionalText = z.string().trim().min(1).nullable().optional();
const optionalUrl = z.string().trim().url().nullable().optional();
const optionalDate = z.string().date().nullable().optional();

export const uhpAccessGrantSchema = z.object({
  userId: z.string().uuid(),
  module: z.enum(UHP_MODULE_VALUES),
});

export const uhpClientSchema = z.object({
  name: z.string().trim().min(1).max(300),
  status: z.enum(UHP_CLIENT_STATUS_VALUES).default('Prospect'),
  clientType: z.enum(UHP_CLIENT_TYPE_VALUES).nullable().optional(),
  interestState: z.enum(['unknown', 'interested', 'declined']).default('unknown'),
  leadOwner: optionalText,
  sourceName: optionalText,
  email: z.string().trim().email().nullable().optional(),
  phone: optionalText,
  alternatePhone: optionalText,
  instagramUrl: optionalUrl,
  website: optionalText,
  jobTitle: optionalText,
  officeAddress: optionalText,
  chatgptUrl: optionalUrl,
  dueDate: optionalDate,
});
export const uhpClientUpdateSchema = uhpClientSchema.partial();

export const uhpClientActivitySchema = z.object({
  activityType: z.enum(UHP_ACTIVITY_TYPE_VALUES).default('Interaction'),
  direction: z.enum(['inbound', 'outbound']).nullable().optional(),
  channel: optionalText,
  title: z.string().trim().min(1).max(300),
  notes: optionalText,
  status: z.enum(['To Do', 'Complete']).default('Complete'),
  occurredAt: z.string().datetime().optional(),
  followUpAt: z.string().datetime().nullable().optional(),
  replyReceived: z.boolean().default(false),
  prospectOutcome: z.enum(['interested', 'declined']).nullable().optional(),
  appointmentType: z.enum(['wellness_evaluation', 'call']).nullable().optional(),
  appointmentAt: z.string().datetime().nullable().optional(),
});

export const uhpClientNoteSchema = z.object({
  title: z.string().trim().min(1).max(300),
  body: optionalText,
});

export const uhpReminderRunSchema = z.object({
  reminderType: z.enum(UHP_REMINDER_TYPES),
  deadlineDate: optionalDate,
  scheduledFor: z.string().datetime(),
  destinationKey: z.string().trim().min(1).max(200),
  idempotencyKey: z.string().trim().min(1).max(300),
  status: z.enum(['pending', 'sent', 'failed', 'skipped']),
  n8nExecutionId: optionalText,
  telegramMessageId: optionalText,
  errorMessage: optionalText,
  metadata: z.record(z.unknown()).default({}),
  sentAt: z.string().datetime().nullable().optional(),
});

export const uhpVpEntrySchema = z.object({
  reportingMonth: z.string().date(),
  category: z.enum(UHP_VP_CATEGORY_VALUES),
  orderId: optionalText,
  memberId: optionalText,
  memberName: z.string().trim().min(1).max(300),
  memberLevel: optionalText,
  discountPercent: z.number().min(0).max(100).nullable().optional(),
  orderDate: z.string().date(),
  paymentStatus: optionalText,
  handlerName: optionalText,
  volumePoints: z.number().finite().min(0),
  amount: z.number().finite().nullable().optional(),
  currency: optionalText,
  originalAmountText: optionalText,
});
export const uhpVpEntryUpdateSchema = uhpVpEntrySchema.partial();

export const uhpVpTargetsSchema = z.object({
  reportingMonth: z.string().date(),
  targets: z.array(
    z.object({
      category: z.enum(UHP_VP_CATEGORY_VALUES),
      targetVp: z.number().finite().min(0),
      forecastVp: z.number().finite().min(0),
    })
  ),
});

export const uhpVpDigestRunSchema = z.object({
  intervalStartedAt: z.string().datetime(),
  intervalEndedAt: z.string().datetime(),
  reportingMonth: z.string().date(),
  destinationKey: z.string().trim().min(1).max(200),
  idempotencyKey: z.string().trim().min(1).max(300),
  status: z.enum(['pending', 'sent', 'failed', 'skipped']),
  summary: z.record(z.unknown()),
  n8nExecutionId: optionalText,
  telegramMessageId: optionalText,
  errorMessage: optionalText,
  sentAt: z.string().datetime().nullable().optional(),
});
