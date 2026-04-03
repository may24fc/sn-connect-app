import { z } from 'zod';

export const ticketTeamSchema = z.enum(['hr', 'it']);
export const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const ticketStatusSchema = z.enum([
  'new',
  'triaged',
  'assigned',
  'in_progress',
  'waiting_on_user',
  'resolved',
  'closed',
]);

export const HR_TICKET_CATEGORIES = [
  'payroll_benefits',
  'leave_attendance',
  'employee_records',
  'onboarding_offboarding',
  'policy_clarification',
  'workplace_support',
  'other_hr',
] as const;

export const IT_TICKET_CATEGORIES = [
  'access_permissions',
  'bug_report',
  'performance_issue',
  'data_issue',
  'integration_notifications',
  'hardware_software',
  'feature_request',
  'other_it',
] as const;

export const TICKET_CATEGORY_VALUES = [...HR_TICKET_CATEGORIES, ...IT_TICKET_CATEGORIES] as const;
export const TICKET_FEATURE_AREA_VALUES = [
  'authentication',
  'dashboard',
  'profile',
  'tasks',
  'reports',
  'tickets',
  'documents',
  'announcements',
  'resources',
  'performance',
  'payroll',
  'onboarding',
  'employee_management',
  'recruitment',
  'ai_knowledge',
  'company_pulse',
  'mobile_app',
  'hardware_software',
  'other',
] as const;

export const ticketCategorySchema = z.enum(TICKET_CATEGORY_VALUES);
export const ticketFeatureAreaSchema = z.enum(TICKET_FEATURE_AREA_VALUES);

export type TicketTeam = z.infer<typeof ticketTeamSchema>;
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;
export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type TicketCategory = z.infer<typeof ticketCategorySchema>;
export type TicketFeatureArea = z.infer<typeof ticketFeatureAreaSchema>;

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  payroll_benefits: 'Payroll & Benefits',
  leave_attendance: 'Leave & Attendance',
  employee_records: 'Employee Records',
  onboarding_offboarding: 'Onboarding & Offboarding',
  policy_clarification: 'Policy Clarification',
  workplace_support: 'Workplace Support',
  other_hr: 'Other HR Request',
  access_permissions: 'Access & Permissions',
  bug_report: 'Bug or Error',
  performance_issue: 'Performance Issue',
  data_issue: 'Data Issue',
  integration_notifications: 'Integration or Notifications',
  hardware_software: 'Hardware or Software',
  feature_request: 'Feature Request',
  other_it: 'Other IT Request',
};

export const TICKET_FEATURE_AREA_LABELS: Record<TicketFeatureArea, string> = {
  authentication: 'Authentication & Login',
  dashboard: 'Dashboard',
  profile: 'Profile',
  tasks: 'Tasks',
  reports: 'Reports',
  tickets: 'Tickets',
  documents: 'Documents & Files',
  announcements: 'Announcements',
  resources: 'Resources',
  performance: 'Performance',
  payroll: 'Payroll & Invoices',
  onboarding: 'Onboarding',
  employee_management: 'Employee Management',
  recruitment: 'Recruitment & Jobs',
  ai_knowledge: 'AI Knowledge',
  company_pulse: 'Company Calendar',
  mobile_app: 'Mobile App',
  hardware_software: 'Hardware or Software',
  other: 'Other',
};

export const TICKET_CATEGORY_OPTIONS_BY_TEAM = {
  hr: HR_TICKET_CATEGORIES.map((value) => ({ value, label: TICKET_CATEGORY_LABELS[value] })),
  it: IT_TICKET_CATEGORIES.map((value) => ({ value, label: TICKET_CATEGORY_LABELS[value] })),
} as const;

export const TICKET_FEATURE_AREA_OPTIONS = TICKET_FEATURE_AREA_VALUES.map((value) => ({
  value,
  label: TICKET_FEATURE_AREA_LABELS[value],
}));

export const DEFAULT_TICKET_CATEGORY_BY_TEAM: Record<TicketTeam, TicketCategory> = {
  hr: 'payroll_benefits',
  it: 'bug_report',
};

function optionalTicketTextField(maxLength: number) {
  return z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return value ?? null;
      }

      const normalizedValue = value.trim();
      return normalizedValue.length > 0 ? normalizedValue : null;
    },
    z.string().max(maxLength).nullable().optional()
  );
}

export const ticketCreateSchema = z.object({
  title: z.string().trim().min(3, 'Title is required').max(200),
  description: z.string().trim().min(10, 'Description is required').max(5000),
  team: ticketTeamSchema,
  category: ticketCategorySchema,
  featureArea: ticketFeatureAreaSchema.nullable().optional(),
  priority: ticketPrioritySchema.default('medium'),
  stepsToReproduce: optionalTicketTextField(4000),
  expectedBehavior: optionalTicketTextField(4000),
}).superRefine((value, context) => {
  const allowedCategories: ReadonlyArray<TicketCategory> =
    value.team === 'hr' ? HR_TICKET_CATEGORIES : IT_TICKET_CATEGORIES;

  if (!allowedCategories.includes(value.category)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['category'],
      message: `Select a valid ${value.team.toUpperCase()} ticket category`,
    });
  }

  if (value.team === 'it' && !value.featureArea) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['featureArea'],
      message: 'Feature area is required for IT tickets',
    });
  }
});

export const ticketUpdateSchema = z.object({
  team: ticketTeamSchema.optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  priority: ticketPrioritySchema.optional(),
  status: ticketStatusSchema.optional(),
  resolutionSummary: z.string().trim().max(5000).nullable().optional(),
});

export const ticketHandlerSchema = z.object({
  userId: z.string().uuid('A valid user is required'),
});

export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;