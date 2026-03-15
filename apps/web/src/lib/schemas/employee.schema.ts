import { EmploymentType, UserStatus, WorkArrangement } from '@hr-portal/database';
import { validatePhoneNumber } from '@/lib/validation/phone';
import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const employeeBaseSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1, 'Last name is required'),
  birthday: dateSchema.optional().nullable(),
  dateHired: dateSchema,
  employmentType: z.nativeEnum(EmploymentType),
  workArrangement: z.nativeEnum(WorkArrangement),
  status: z.nativeEnum(UserStatus).optional(),
  position: z.string().min(1, 'Position is required'),
  department: z.string().min(1, 'Department is required'),
  probationEndDate: dateSchema.optional().nullable(),
  phone: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        return validatePhoneNumber(val, 'GLOBAL');
      },
      { message: 'Invalid phone number. Include country code (e.g., +63)' }
    ),
  personalEmail: z.string().email().optional().nullable(),
  companyEmail: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactNumber: z
    .string()
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
