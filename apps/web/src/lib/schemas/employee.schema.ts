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

/** Columns accepted by POST /api/employees. Server-managed fields are intentionally absent. */
export const employeeApiCreateSchema = z.object({
  user_id: z.string().uuid(),
  employee_number: z.string().trim().min(1).max(50),
  first_name: employeeBaseSchema.shape.firstName,
  middle_name: employeeBaseSchema.shape.middleName,
  last_name: employeeBaseSchema.shape.lastName,
  birthday: employeeBaseSchema.shape.birthday,
  date_hired: employeeBaseSchema.shape.dateHired,
  employment_type: employeeBaseSchema.shape.employmentType,
  work_arrangement: employeeBaseSchema.shape.workArrangement,
  position: employeeBaseSchema.shape.position.optional(),
  department: employeeBaseSchema.shape.department,
  probation_end_date: employeeBaseSchema.shape.probationEndDate,
  phone: employeeBaseSchema.shape.phone,
  personal_email: employeeBaseSchema.shape.personalEmail,
  company_email: employeeBaseSchema.shape.companyEmail,
  address: employeeBaseSchema.shape.address,
  city: employeeBaseSchema.shape.city,
  province: employeeBaseSchema.shape.province,
  postal_code: employeeBaseSchema.shape.postalCode,
  emergency_contact_name: employeeBaseSchema.shape.emergencyContactName,
  emergency_contact_number: employeeBaseSchema.shape.emergencyContactNumber,
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
