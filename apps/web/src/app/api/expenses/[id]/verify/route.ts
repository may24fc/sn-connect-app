import { logActivity } from '@/lib/audit';
import { CurrencyConversionService } from '@/lib/fx/currency-conversion-service';
import { createNotification, getUserDisplayName } from '@/lib/notifications/create-notification';
import { type ExpenseVerifyInput, expenseVerifySchema } from '@/lib/schemas/expense.schema';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RiskRoutingResult = {
  riskBucket: 'standard_recurring' | 'price_spike' | 'non_recurring';
  processingStatus: 'auto_approved' | 'leadership_review_required';
  baselineAverage: number | null;
  comparisonBasis: 'previous_month_average' | 'general_average' | 'no_history_unrecognized';
};

function isAccountingDepartmentCandidate(name: string, description?: string | null): boolean {
  const normalizedName = name.trim().toLowerCase();
  const normalizedDescription = (description ?? '').trim().toLowerCase();

  // Primary path: explicit accounting naming.
  if (normalizedName.includes('accounting')) {
    return true;
  }

  // Canonical fallback: finance departments explicitly scoped to accounting work.
  return normalizedName === 'finance' && normalizedDescription.includes('accounting');
}

/**
 * Calculates risk bucket for verified expense entries based on vendor history.
 * - Standard Recurring: Known vendor + within 10% baseline average -> Auto-approved.
 * - Price Spike: Known vendor + amount exceeds baseline average by >10% -> Yellow flag.
 * - Non-Recurring: New / unrecognized vendor -> Red flag.
 */
async function computeRiskRouting(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  vendorName: string,
  transactionDate: string,
  verifiedAmount: number
): Promise<RiskRoutingResult> {
  const { data: allHistory, error } = await adminClient
    .from('expense_entries')
    .select('total_amount, transaction_date')
    .ilike('vendor_name', vendorName.trim())
    .is('deleted_at', null)
    .in('processing_status', ['verified', 'auto_approved', 'approved'])
    .order('transaction_date', { ascending: false });

  if (error || !allHistory || allHistory.length === 0) {
    return {
      riskBucket: 'non_recurring',
      processingStatus: 'leadership_review_required',
      baselineAverage: null,
      comparisonBasis: 'no_history_unrecognized',
    };
  }

  // Segment same-vendor history to calculate previous calendar month average.
  const txDate = new Date(transactionDate);
  const prevMonthYear = txDate.getMonth() === 0 ? txDate.getFullYear() - 1 : txDate.getFullYear();
  const prevMonth = txDate.getMonth() === 0 ? 11 : txDate.getMonth() - 1;

  const prevMonthStart = new Date(Date.UTC(prevMonthYear, prevMonth, 1))
    .toISOString()
    .split('T')[0] as string;
  const prevMonthEnd = new Date(Date.UTC(prevMonthYear, prevMonth + 1, 0))
    .toISOString()
    .split('T')[0] as string;

  const prevMonthEntries = allHistory.filter((entry) => {
    return entry.transaction_date >= prevMonthStart && entry.transaction_date <= prevMonthEnd;
  });

  let average = 0;
  let basis: 'previous_month_average' | 'general_average' = 'general_average';

  if (prevMonthEntries.length > 0) {
    const sum = prevMonthEntries.reduce((total, row) => total + Number(row.total_amount), 0);
    average = sum / prevMonthEntries.length;
    basis = 'previous_month_average';
  } else {
    // Fall back to general historical average (cap at last 10 entries for noise filter).
    const recentEntries = allHistory.slice(0, 10);
    const sum = recentEntries.reduce((total, row) => total + Number(row.total_amount), 0);
    average = sum / recentEntries.length;
    basis = 'general_average';
  }

  // 10% threshold buffer for standard recurring validation.
  const priceSpikeThreshold = average * 1.1;

  if (verifiedAmount > priceSpikeThreshold) {
    return {
      riskBucket: 'price_spike',
      processingStatus: 'leadership_review_required',
      baselineAverage: average,
      comparisonBasis: basis,
    };
  }

  return {
    riskBucket: 'standard_recurring',
    processingStatus: 'auto_approved',
    baselineAverage: average,
    comparisonBasis: basis,
  };
}

async function fetchAndEnforceUserRole(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
): Promise<string> {
  // Fetch app-level role and canonical department id first.
  const { data: userData, error: userError } = await adminClient
    .from('users')
    .select('role, id, department_id')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (userError) {
    throw new Error('Forbidden: Unable to resolve user profile');
  }

  const userRole = userData?.role ?? 'employee';

  // System administrators and super administrators are always authorized
  if (userRole === 'admin' || userRole === 'super_admin') {
    return userRole;
  }

  // Accounting interns and accounting staff are allowed as non-admin reviewers.
  if (userRole !== 'intern' && userRole !== 'employee') {
    throw new Error('Forbidden: Only Accounting staff or interns can verify expenses');
  }

  // Prefer canonical database helper for department authorization.
  const { data: isAccountingMember, error: accountingCheckError } = await adminClient.rpc(
    'user_is_accounting_member',
    {
      target_user_id: userId,
    }
  );

  if (!accountingCheckError) {
    if (!isAccountingMember) {
      throw new Error('Forbidden: Only Accounting department can verify expenses');
    }

    return userRole;
  }

  // Resolve canonical department name from users.department_id.
  let canonicalDepartmentName: string | null = null;
  let canonicalDepartmentDescription: string | null = null;
  const departmentId =
    (userData as { department_id?: string | null } | null)?.department_id ?? null;

  if (departmentId) {
    const { data: departmentData, error: departmentError } = await adminClient
      .from('departments')
      .select('name, description, deleted_at')
      .eq('id', departmentId)
      .maybeSingle();

    if (!departmentError && departmentData?.name) {
      canonicalDepartmentName = departmentData.name;
      canonicalDepartmentDescription = departmentData.description ?? null;
    }
  }

  // Fallback path for environments where helper function is not yet migrated.
  // Canonical path: department comes from users.department_id -> departments.name.
  if (
    canonicalDepartmentName &&
    isAccountingDepartmentCandidate(canonicalDepartmentName, canonicalDepartmentDescription)
  ) {
    return userRole;
  }

  // Check all active employee rows for this user to avoid false-negative auth
  // when canonical department_id is missing but legacy employee text still exists.
  const { data: activeEmployeeRows, error: activeEmployeeError } = await adminClient
    .from('employees')
    .select('department')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (activeEmployeeError) {
    throw new Error('Forbidden: Unable to resolve employee department');
  }

  let normalizedDepartments = (activeEmployeeRows ?? [])
    .map((row) => (typeof row.department === 'string' ? row.department.trim().toLowerCase() : ''))
    .filter(Boolean);

  // Controlled fallback: some records drift where active linkage is missing but
  // latest historical department still reflects the user's current assignment.
  if (normalizedDepartments.length === 0) {
    const { data: fallbackEmployeeRows, error: fallbackEmployeeError } = await adminClient
      .from('employees')
      .select('department, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (fallbackEmployeeError) {
      throw new Error('Forbidden: Unable to resolve employee department');
    }

    normalizedDepartments = (fallbackEmployeeRows ?? [])
      .map((row) => (typeof row.department === 'string' ? row.department.trim().toLowerCase() : ''))
      .filter(Boolean);
  }

  const isAccounting = normalizedDepartments.some((department) => {
    return department.includes('accounting') || department === 'finance';
  });

  if (!isAccounting) {
    throw new Error('Forbidden: Only Accounting department can verify expenses');
  }

  return userRole;
}

async function fetchAndEnforceExpenseState(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  id: string
) {
  const { data: expenseEntry, error: loadError } = await adminClient
    .from('expense_entries')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (loadError || !expenseEntry) {
    throw new Error('Expense entry not found');
  }

  if (expenseEntry.processing_status !== 'awaiting_intern_review') {
    throw new Error(`Cannot verify entry in processing state: ${expenseEntry.processing_status}`);
  }

  return expenseEntry;
}

async function notifySubmitterOfVerification(
  ownerUserId: string,
  expenseEntry: { vendor_name: string; currency: string },
  finalTotalAmount: number,
  reviewerDisplayName: string,
  id: string,
  routingResult: RiskRoutingResult
) {
  if (routingResult.processingStatus === 'auto_approved') {
    createNotification({
      userId: ownerUserId,
      type: 'system',
      title: 'Expense Auto-Approved',
      message: `Your expense at ${expenseEntry.vendor_name} for ${expenseEntry.currency} ${finalTotalAmount} was verified by ${reviewerDisplayName} and auto-approved based on standard baseline matching.`,
      link: '/employee/expenses',
      metadata: { expenseId: id, totalAmount: finalTotalAmount, status: 'auto_approved' },
    });
  } else {
    createNotification({
      userId: ownerUserId,
      type: 'system',
      title: 'Expense Escalated to Leadership',
      message: `Your expense at ${expenseEntry.vendor_name} for ${expenseEntry.currency} ${finalTotalAmount} was verified by ${reviewerDisplayName} and routed to Miss May and Steven for review (${
        routingResult.riskBucket === 'price_spike'
          ? 'Sudden price spike detected'
          : 'Unrecognized vendor expense'
      }).`,
      link: '/employee/expenses',
      metadata: { expenseId: id, riskBucket: routingResult.riskBucket },
    });
  }
}

interface MinimalExpenseEntry {
  vendor_name: string;
  transaction_date: string;
  currency: string;
  exchange_rate_to_aud: number | null;
  fx_rates_fetched_at?: string | null;
  fx_source?: string | null;
  tax_amount: string | number | null;
  total_amount: string | number | null;
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

async function executeVerificationTransaction(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  id: string,
  userId: string,
  expenseEntry: MinimalExpenseEntry,
  parsedData: ExpenseVerifyInput
) {
  const conversionService = new CurrencyConversionService(adminClient);
  const finalDebitAccount = parsedData.verifiedDebitAccount;
  const finalCreditAccount = parsedData.verifiedCreditAccount;
  const finalReviewerNotes = parsedData.reviewerNotes || null;

  const finalTaxAmount = parsedData.taxAmount ?? Number(expenseEntry.tax_amount);
  const finalTotalAmount = parsedData.totalAmount ?? Number(expenseEntry.total_amount);
  const sourceCurrency = parsedData.sourceCurrency;
  const normalizedTaxAmount = Number.isFinite(finalTaxAmount) ? finalTaxAmount : 0;

  const resolvedRate = await conversionService.getRateToAud(sourceCurrency);
  const fxRatesFetchedAt = resolvedRate.fxRatesFetchedAt ?? expenseEntry.fx_rates_fetched_at ?? null;
  const fxSource = resolvedRate.fxSource ?? expenseEntry.fx_source ?? 'base_currency';

  let finalExchangeRateToAud = resolvedRate.exchangeRateToAud;

  if (sourceCurrency !== 'AUD') {
    if (typeof parsedData.exchangeRateToAud === 'number' && parsedData.exchangeRateToAud > 0) {
      finalExchangeRateToAud = parsedData.exchangeRateToAud;
    }
  } else {
    finalExchangeRateToAud = 1;
  }

  const finalTotalAmountAud = roundToCents(finalTotalAmount * finalExchangeRateToAud);
  const finalTaxAmountAud = roundToCents(normalizedTaxAmount * finalExchangeRateToAud);

  const routingResult = await computeRiskRouting(
    adminClient,
    expenseEntry.vendor_name,
    expenseEntry.transaction_date,
    finalTotalAmount
  );

  const now = new Date().toISOString();

  const { data: updatedEntry, error: updateError } = await adminClient
    .from('expense_entries')
    .update({
      verified_debit_account: finalDebitAccount,
      verified_credit_account: finalCreditAccount,
      reviewer_notes: finalReviewerNotes,
      tax_amount: finalTaxAmount,
      total_amount: finalTotalAmount,
      currency: sourceCurrency,
      exchange_rate_to_aud: finalExchangeRateToAud,
      total_amount_aud: finalTotalAmountAud,
      tax_amount_aud: finalTaxAmountAud,
      fx_rates_fetched_at: fxRatesFetchedAt,
      fx_source: fxSource,
      reviewed_by: userId,
      reviewed_at: now,
      risk_bucket: routingResult.riskBucket,
      processing_status: routingResult.processingStatus,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError || !updatedEntry) {
    throw new Error('Failed to save verification');
  }

  return { updatedEntry, routingResult, finalTotalAmount };
}

/**
 * POST /api/expenses/[id]/verify
 * Verification checkpoint endpoint for Accounting department reviewers.
 * Receives verifications, executes double-entry locks, runs post-review risk routing,
 * and notifies owners / escalates exception items immediately.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role enforcement
    try {
      await fetchAndEnforceUserRole(adminClient, user.id);
    } catch (roleErr) {
      const msg = roleErr instanceof Error ? roleErr.message : 'Forbidden';
      return NextResponse.json({ error: msg }, { status: 403 });
    }

    // Retrieve original entry and enforce state
    let expenseEntry: Awaited<ReturnType<typeof fetchAndEnforceExpenseState>>;
    try {
      expenseEntry = await fetchAndEnforceExpenseState(adminClient, id);
    } catch (stateErr) {
      const msg = stateErr instanceof Error ? stateErr.message : 'Expense entry not found';
      return NextResponse.json({ error: msg }, { status: msg.includes('state') ? 400 : 404 });
    }

    // Input validation
    const body = await request.json();
    const parsed = expenseVerifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid verification body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Execute the database mutation and auto-routing scoring
    let transactionRes: Awaited<ReturnType<typeof executeVerificationTransaction>>;
    try {
      transactionRes = await executeVerificationTransaction(
        adminClient,
        id,
        user.id,
        expenseEntry,
        parsed.data
      );
    } catch (txErr) {
      console.error('Failed to commit verified expense:', txErr);
      return NextResponse.json({ error: 'Failed to save verification' }, { status: 500 });
    }

    const { updatedEntry, routingResult, finalTotalAmount } = transactionRes;

    // Audit trace Logging
    logActivity(supabase, {
      userId: user.id,
      action: 'verify_expense_entry',
      tableName: 'expense_entries',
      recordId: id,
      metadata: {
        vendorName: expenseEntry.vendor_name,
        riskBucket: routingResult.riskBucket,
        processingStatus: routingResult.processingStatus,
        basis: routingResult.comparisonBasis,
        baselineAverage: routingResult.baselineAverage,
      },
    });

    // Notify submitter and route alerts
    const reviewerDisplayName = await getUserDisplayName(user.id);
    const ownerUserId = expenseEntry.submitted_by;

    await notifySubmitterOfVerification(
      ownerUserId,
      expenseEntry,
      finalTotalAmount,
      reviewerDisplayName,
      id,
      routingResult
    );

    return NextResponse.json({
      data: {
        expenseEntry: updatedEntry,
        routingResult,
      },
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/expenses/[id]/verify:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
