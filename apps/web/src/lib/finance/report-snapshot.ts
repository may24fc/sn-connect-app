import { z } from 'zod';

/** Shape of `finance_report_snapshots.report_data`, shared by the CSV export and the snapshot viewer. */
export const financeSnapshotReportSchema = z.object({
  reportMonthLabel: z.string().optional(),
  generatedAt: z.string().optional(),
  summary: z.array(
    z.object({
      metric: z.string(),
      currentMonth: z.number(),
      previousMonth: z.number(),
      momPercentChange: z.number().nullable(),
    })
  ),
  categoryBreakdown: z.array(
    z.object({
      category: z.string(),
      spendAud: z.number(),
      percentOfTotal: z.number(),
    })
  ),
  previousCategoryBreakdown: z.array(
    z.object({
      category: z.string(),
      spendAud: z.number(),
    })
  ),
  departmentBreakdown: z.array(
    z.object({
      departmentName: z.string(),
      spendAud: z.number(),
      momVariationPercent: z.number().nullable(),
    })
  ),
  previousDepartmentBreakdown: z.array(
    z.object({
      departmentName: z.string(),
      spendAud: z.number(),
    })
  ),
  pipelineStatus: z.object({
    autoApproved: z.number(),
    awaitingAssociateReview: z.number(),
    approved: z.number(),
    draftExtracted: z.number(),
  }),
  anomalies: z.array(
    z.object({
      vendorName: z.string(),
      transactionDate: z.string(),
      totalAmountAud: z.number(),
      varianceAmountAud: z.number().nullable(),
      reason: z.string(),
    })
  ),
  unknownPayments: z
    .array(
      z.object({
        vendorName: z.string(),
        transactionDate: z.string(),
        currency: z.string(),
        amount: z.number(),
      })
    )
    .optional(),
  paymentStatusCounts: z
    .object({ unknown: z.number(), unpaid: z.number(), confirmed: z.number() })
    .optional(),
  audEstimates: z
    .object({
      currentMonthAud: z.number(),
      currentMonthEntries: z.number(),
      previousMonthAud: z.number(),
      previousMonthEntries: z.number(),
    })
    .optional(),
  subscriptionsAsOfSnapshot: z
    .array(
      z.object({
        id: z.string(),
        vendor_name: z.string(),
        active: z.boolean(),
        payment_source: z.string(),
        monthly_amount_aud: z.number().nullable(),
        seats: z.number().nullable(),
        next_renewal: z.string().nullable(),
        last_charged: z.string().nullable(),
      })
    )
    .optional(),
  wiseImportRowsForMonth: z
    .array(
      z.object({
        payment_reference: z.string().nullable(),
        result: z.string(),
        detail: z.string().nullable(),
        imported_at: z.string(),
        resolved_at: z.string().nullable(),
      })
    )
    .optional(),
});

export type FinanceSnapshotReport = z.infer<typeof financeSnapshotReportSchema>;
