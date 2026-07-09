import { z } from 'zod';

export const revenueForecastYearSchema = z.coerce.number().int().min(2000).max(2100);
export const revenueForecastMonthSchema = z.coerce.number().int().min(1).max(12);

export const revenueForecastEntryUpsertSchema = z.object({
  year: revenueForecastYearSchema,
  month: revenueForecastMonthSchema,
  actualRevenueAud: z.coerce.number().min(0),
  notes: z.string().max(2000).optional().nullable(),
});

export const revenueForecastEntryUpdateSchema = z.object({
  actualRevenueAud: z.coerce.number().min(0).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const revenueForecastGoalCreateSchema = z.object({
  year: revenueForecastYearSchema,
  goalAmountAud: z.coerce.number().positive(),
  label: z.string().max(120).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional().default(0),
});

export const revenueForecastGrantSchema = z.object({
  userId: z.string().uuid('User id must be a valid UUID'),
});
