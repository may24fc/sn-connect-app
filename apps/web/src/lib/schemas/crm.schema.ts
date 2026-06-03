import { z } from 'zod';

export const CRM_PIPELINE_CONTEXT_VALUES = ['SFO', 'TECH'] as const;
export type CrmPipelineContext = (typeof CRM_PIPELINE_CONTEXT_VALUES)[number];

export const SFO_PLATFORM_VALUES = ['Meta', 'Google Ads'] as const;
export const SFO_STATUS_VALUES = ['new', 'for_follow_up', 'closed', 'lost'] as const;
export const SFO_CUSTOMER_TYPE_VALUES = ['new', 'returning', 'wholesale'] as const;

export const TECH_PIPELINE_STAGE_VALUES = [
  'initial_contact',
  'requirements_gathering',
  'proposal_sent',
  'under_review',
  'closed_won',
  'closed_lost',
] as const;

const optionalTrimmedText = z.string().trim().min(1).optional();

export const sfoLeadCreateSchema = z.object({
  customerName: z.string().trim().min(1),
  socialLink: optionalTrimmedText,
  messageSource: optionalTrimmedText,
  platform: z.enum(SFO_PLATFORM_VALUES),
  dateOfContact: z.string().date(),
  actionPlan: optionalTrimmedText,
  followUpStatus: z.enum(SFO_STATUS_VALUES).default('new'),
  actionTaken: optionalTrimmedText,
  customerType: z.enum(SFO_CUSTOMER_TYPE_VALUES).default('new'),
  reasonForReachingOut: optionalTrimmedText,
  contactNumber: optionalTrimmedText,
  address: optionalTrimmedText,
  orderDate: z.string().date().optional(),
  products: z.array(z.string().trim().min(1)).default([]),
  amount: z.number().finite().min(0),
  invoiceNumber: optionalTrimmedText,
  status: z.enum(SFO_STATUS_VALUES).default('new'),
  remarks: optionalTrimmedText,
});

export const sfoLeadUpdateSchema = sfoLeadCreateSchema.partial();

export const techInquiryCreateSchema = z.object({
  companyName: z.string().trim().min(1),
  contactPerson: z.string().trim().min(1),
  companyBackground: optionalTrimmedText,
  requirementsSummary: z.string().trim().min(1),
  requirementsChecklist: z.array(z.string().trim().min(1)).default([]),
  pipelineStage: z.enum(TECH_PIPELINE_STAGE_VALUES).default('initial_contact'),
  longFormRemarks: optionalTrimmedText,
  followUpDate: z.string().date().optional(),
  assignedRep: optionalTrimmedText,
});

export const techInquiryUpdateSchema = techInquiryCreateSchema.partial();
