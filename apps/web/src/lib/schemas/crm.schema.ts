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

const optionalShortText = z.string().trim().min(1).max(300).optional();
const optionalNarrative = z.string().trim().min(1).max(5000).optional();

export const sfoLeadCreateSchema = z.object({
  customerName: z.string().trim().min(1).max(300),
  socialLink: z.string().trim().min(1).max(2048).optional(),
  messageSource: optionalShortText,
  platform: z.enum(SFO_PLATFORM_VALUES),
  dateOfContact: z.string().date(),
  actionPlan: optionalNarrative,
  followUpStatus: z.enum(SFO_STATUS_VALUES).default('new'),
  actionTaken: optionalNarrative,
  customerType: z.enum(SFO_CUSTOMER_TYPE_VALUES).default('new'),
  reasonForReachingOut: optionalShortText,
  contactNumber: z.string().trim().min(1).max(30).optional(),
  address: z.string().trim().min(1).max(500).optional(),
  orderDate: z.string().date().optional(),
  products: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
  amount: z.number().finite().min(0),
  invoiceNumber: optionalShortText,
  status: z.enum(SFO_STATUS_VALUES).default('new'),
  remarks: optionalNarrative,
});

export const sfoLeadUpdateSchema = sfoLeadCreateSchema.partial();

export const techInquiryCreateSchema = z.object({
  companyName: z.string().trim().min(1).max(300),
  contactPerson: z.string().trim().min(1).max(300),
  companyBackground: optionalNarrative,
  requirementsSummary: z.string().trim().min(1).max(5000),
  requirementsChecklist: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  pipelineStage: z.enum(TECH_PIPELINE_STAGE_VALUES).default('initial_contact'),
  longFormRemarks: optionalNarrative,
  followUpDate: z.string().date().optional(),
  assignedRep: optionalShortText,
});

export const techInquiryUpdateSchema = techInquiryCreateSchema.partial();
