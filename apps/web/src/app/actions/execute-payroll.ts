'use server';

/**
 * execute-payroll.ts — Two-Phase Commit Payroll Execution
 *
 * Phase 1 (Ledger Entry):
 *   Insert a `pending` record into `wise_payments` with a unique idempotency key.
 *   This ensures the intent is recorded BEFORE any external API call.
 *
 * Phase 2 (Wise API Call):
 *   Quote → Transfer → Fund through the Wise API.
 *   On success: update ledger to `processing` with the wire_transfer_id.
 *   On failure: update ledger to `failed` with the error message.
 *
 * Phase 3 occurs asynchronously via the Wise webhook (see /api/webhooks/wise).
 */

import { randomUUID } from 'node:crypto';

import { logActivity } from '@/lib/audit';
import { executePayrollSchema } from '@/lib/schemas/wise.schema';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import {
  WiseApiError,
  createQuote,
  createTransfer,
  fundTransfer,
} from '@/lib/wise/client';

const WISE_ENVIRONMENT = process.env.WISE_ENVIRONMENT ?? 'sandbox';

interface ExecutePayrollResult {
  success: boolean;
  paymentId?: string;
  wiseTransferId?: number;
  error?: string;
}

export async function executePayroll(
  input: unknown
): Promise<ExecutePayrollResult> {
  // ────────────────────────────────────────────────
  // 0. AUTH CHECK
  // ────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Only admin / super_admin may execute payroll
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const adminRoles = ['admin', 'super_admin'];
  if (!userData || !adminRoles.includes(userData.role)) {
    return { success: false, error: 'Forbidden: admin role required' };
  }

  // ────────────────────────────────────────────────
  // 1. INPUT VALIDATION
  // ────────────────────────────────────────────────
  const parsed = executePayrollSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    };
  }

  const {
    invoiceId,
    recipientId,
    sourceCurrency,
    targetCurrency,
    sourceAmount,
    reference,
  } = parsed.data;

  // Use admin client because wise_payments has no authenticated INSERT policy
  const supabaseAdmin = createSupabaseAdminClient();

  // ────────────────────────────────────────────────
  // 2. VERIFY INVOICE EXISTS & IS APPROVED
  // ────────────────────────────────────────────────
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from('invoices')
    .select('id, employee_id, status, net_amount')
    .eq('id', invoiceId)
    .is('deleted_at', null)
    .single();

  if (invoiceError || !invoice) {
    return { success: false, error: 'Invoice not found' };
  }

  if (invoice.status !== 'approved') {
    return {
      success: false,
      error: `Invoice must be approved before payment. Current status: ${invoice.status}`,
    };
  }

  // Prevent duplicate payments: check if a non-failed payment already exists
  const { data: existingPayment } = await supabaseAdmin
    .from('wise_payments')
    .select('id, payment_status')
    .eq('invoice_id', invoiceId)
    .neq('payment_status', 'failed')
    .limit(1)
    .maybeSingle();

  if (existingPayment) {
    return {
      success: false,
      error: `Payment already exists for this invoice (status: ${existingPayment.payment_status})`,
    };
  }

  // ────────────────────────────────────────────────
  // 3. PHASE 1 — LEDGER ENTRY (Idempotency Key)
  // ────────────────────────────────────────────────
  const idempotencyKey = randomUUID();

  const { data: payment, error: insertError } = await supabaseAdmin
    .from('wise_payments')
    .insert({
      invoice_id: invoiceId,
      employee_id: invoice.employee_id,
      initiated_by: user.id,
      wise_recipient_id: String(recipientId),
      idempotency_key: idempotencyKey,
      source_currency: sourceCurrency,
      target_currency: targetCurrency,
      source_amount: sourceAmount,
      payment_status: 'pending' as const,
    })
    .select('id')
    .single();

  if (insertError || !payment) {
    return {
      success: false,
      error: `Failed to create payment ledger entry: ${insertError?.message}`,
    };
  }

  // ────────────────────────────────────────────────
  // 4. PHASE 2 — WISE API (Quote → Transfer → Fund)
  // ────────────────────────────────────────────────
  try {
    // 4a. Create a quote
    const quote = await createQuote({
      sourceCurrency,
      targetCurrency,
      sourceAmount,
    });

    // 4b. Create the transfer using the quote and idempotency key
    const transfer = await createTransfer({
      targetAccount: recipientId,
      quoteUuid: quote.id,
      customerTransactionId: idempotencyKey,
      reference: reference ?? `SN Payroll ${invoiceId.slice(0, 8)}`,
    });

    // 4c. Fund the transfer.
    // Sandbox personal-token setups can create transfers but reject the
    // balance-funding call with 403. In that case, keep the transfer in our
    // ledger and continue testing via Wise simulation + webhook delivery.
    try {
      await fundTransfer(transfer.id);
    } catch (fundError) {
      const isSandboxFundingBypass =
        WISE_ENVIRONMENT === 'sandbox' &&
        fundError instanceof WiseApiError &&
        fundError.statusCode === 403;

      if (!isSandboxFundingBypass) {
        throw fundError;
      }
    }

    // ──────────────────────────────────────────────
    // 5. LEDGER UPDATE — SUCCESS (processing)
    // ──────────────────────────────────────────────
    await supabaseAdmin
      .from('wise_payments')
      .update({
        payment_status: 'processing' as const,
        wise_transfer_id: String(transfer.id),
        wise_quote_id: quote.id,
        target_amount: quote.targetAmount,
        exchange_rate: quote.rate,
        fee: quote.fee,
      })
      .eq('id', payment.id);

    // Audit log the payroll execution (no PII)
    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'PAYROLL_EXECUTED',
      tableName: 'wise_payments',
      recordId: payment.id,
      metadata: {
        invoice_id: invoiceId,
        wise_transfer_id: transfer.id,
        source_currency: sourceCurrency,
        target_currency: targetCurrency,
      },
    });

    return {
      success: true,
      paymentId: payment.id,
      wiseTransferId: transfer.id,
    };
  } catch (err) {
    // ──────────────────────────────────────────────
    // 5b. LEDGER UPDATE — FAILURE
    // ──────────────────────────────────────────────
    const errorMessage =
      err instanceof WiseApiError
        ? `${err.message}: ${err.responseBody}`
        : err instanceof Error
          ? err.message
          : 'Unknown error during Wise API call';

    await supabaseAdmin
      .from('wise_payments')
      .update({
        payment_status: 'failed' as const,
        error_message: errorMessage.slice(0, 1000), // cap at 1000 chars
      })
      .eq('id', payment.id);

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'PAYROLL_FAILED',
      tableName: 'wise_payments',
      recordId: payment.id,
      metadata: {
        invoice_id: invoiceId,
        error: errorMessage.slice(0, 500),
      },
    });

    return { success: false, error: errorMessage };
  }
}
