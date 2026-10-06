import { EmploymentType, UserStatus, WorkArrangement } from '@hr-portal/database';
import { validatePhoneNumber } from '@/lib/validation/phone';
import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const employeeBaseSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(120),
  middleName: z.string().max(120).optional().nullable(),
  lastName: z.string().min(1, 'Last name is required').max(120),
  birthday: dateSchema.optional().nullable(),
  dateHired: dateSchema,
  employmentType: z.nativeEnum(EmploymentType),
  workArrangement: z.nativeEnum(WorkArrangement),
  status: z.nativeEnum(UserStatus).optional(),
  position: z.string().min(1, 'Position is required').max(150),
  department: z.string().min(1, 'Department is required').max(150),
  probationEndDate: dateSchema.optional().nullable(),
  phone: z
    .string()
    .max(30)
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        return validatePhoneNumber(val, 'GLOBAL');
      },
      { message: 'Invalid phone number. Include country code (e.g., +63)' }
    ),
  personalEmail: z.string().email().max(320).optional().nullable(),
  companyEmail: z.string().email().max(320).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  emergencyContactName: z.string().max(120).optional().nullable(),
  emergencyContactNumber: z
    .string()
    .max(30)
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        return validatePhoneNumber(val, 'GLOBAL');
      },
      { message: 'Invalid phone number. Include country code (e.g., +63)' }
    ),
});

export const employeeCreateSchema = employeeBaseSchema;
export const employeeUpdateSchema = employeeBaseSchema.partial();

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
