import { isPossiblePhoneNumber } from 'libphonenumber-js';
import { z } from 'zod';

const singleLine = (minimum: number, maximum: number, label: string) =>
  z
    .string()
    .trim()
    .min(minimum, `${label} must be at least ${minimum} characters`)
    .max(maximum, `${label} must be at most ${maximum} characters`)
    .transform((value) => value.replace(/\s+/g, ' '));

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(30, 'Phone number is too long')
  .refine(
    (value) => value.length === 0 || (value.startsWith('+') && isPossiblePhoneNumber(value)),
    'Please enter a possible international phone number'
  )
  .optional()
  .transform((value) => value || undefined);

export const inquirySchema = z.object({
  name: singleLine(2, 200, 'Name'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .max(320, 'Email address is too long'),
  phone: optionalPhoneSchema,
  business_unit_id: z.string().uuid().optional().nullable(),
  subject: singleLine(3, 300, 'Subject'),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message must be at most 5000 characters'),
  company_website: z.string().max(500).optional(),
  form_started_at: z.number().finite().positive().optional(),
});

export type InquiryFormData = z.infer<typeof inquirySchema>;

export type NormalizedInquiry = {
  name: string;
  email: string;
  phone: string | null;
  business_unit_id: string | null;
  subject: string;
  message: string;
};

export function normalizeInquiry(data: InquiryFormData): NormalizedInquiry {
  return {
    name: data.name,
    email: data.email,
    phone: data.phone ?? null,
    business_unit_id: data.business_unit_id ?? null,
    subject: data.subject,
    message: data.message,
  };
}
