/**
 * Resource Targeting Schema - Audience targeting rules validation
 *
 * Controls which users can see a resource based on:
 * - Roles (admin, hr, cos, ceo, employee, intern)
 * - Departments (by UUID)
 * - Specific employees (by UUID)
 *
 * When is_public is true, targeting arrays are ignored.
 * When is_public is false, at least one targeting rule must be specified.
 */
import { z } from 'zod';

// ============================================
// Role Targeting
// ============================================

/** Valid roles for resource targeting (matches user_role enum) */
export const targetRoleSchema = z.enum(['admin', 'hr', 'cos', 'ceo', 'employee', 'intern']);

// ============================================
// Targeting Schema
// ============================================

/**
 * Resource targeting rules.
 * When is_public is false, at least one of target_roles,
 * target_departments, or target_employees must be non-empty.
 */
export const resourceTargetingSchema = z
  .object({
    /** Whether the resource is visible to all authenticated users */
    is_public: z.boolean(),

    /** Roles that can view this resource */
    target_roles: z.array(targetRoleSchema).default([]),

    /** Department UUIDs that can view this resource */
    target_departments: z
      .array(z.string().uuid('Each department ID must be a valid UUID'))
      .default([]),

    /** Specific employee user UUIDs that can view this resource */
    target_employees: z.array(z.string().uuid('Each employee ID must be a valid UUID')).default([]),
  })
  .refine(
    (data) => {
      if (data.is_public) return true;
      return (
        data.target_roles.length > 0 ||
        data.target_departments.length > 0 ||
        data.target_employees.length > 0
      );
    },
    {
      message:
        'Non-public resources must have at least one targeting rule (roles, departments, or employees)',
      path: ['is_public'],
    }
  );

// ============================================
// Inferred Types
// ============================================

/** Validated targeting rules */
export type ResourceTargetingInput = z.infer<typeof resourceTargetingSchema>;

/** Valid target role values */
export type TargetRole = z.infer<typeof targetRoleSchema>;
