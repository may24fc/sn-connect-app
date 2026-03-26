/**
 * Wise Webhook — Phase 3: Asynchronous Settlement
 *
 * This route receives webhook events from Wise when a transfer changes state.
 * SECURITY:
 *   1. Verifies the RSA signature from the X-Signature-SHA256 header
 *      against Wise's public key before processing any payload.
 *   2. Uses Supabase admin client (service role) to update the ledger.
 *   3. Returns 200 immediately so Wise doesn't retry.
 */

import crypto from 'node:crypto';

import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ────────────────────────────────────────────────────────────
// Wise RSA Public Key for webhook signature verification.
// Fetch once from https://api.transferwise.com/v1/webhook/public-keys
// and store as an environment variable.
//
// In sandbox: https://api.sandbox.transferwise.tech/v1/webhook/public-keys
// ────────────────────────────────────────────────────────────

const WISE_WEBHOOK_PUBLIC_KEY = process.env.WISE_WEBHOOK_PUBLIC_KEY ?? '';

/**
 * Verify the Wise webhook RSA-SHA256 signature.
 * Returns true if the signature is valid, false otherwise.
 */
function verifyWiseSignature(
  rawBody: string,
  signatureHeader: string
): boolean {
  if (!WISE_WEBHOOK_PUBLIC_KEY) {
    console.error('WISE_WEBHOOK_PUBLIC_KEY is not configured — rejecting webhook.');
    return false;
  }

  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(rawBody);
    verifier.end();

    return verifier.verify(
      WISE_WEBHOOK_PUBLIC_KEY,
      signatureHeader,
      'base64'
    );
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────────────────────
// Webhook event types we care about
// ────────────────────────────────────────────────────────────

interface WiseWebhookPayload {
  data: {
    resource: {
      id: number;
      profile_id: number;
      type: string;
    };
    current_state: string;
    previous_state: string;
    occurred_at: string;
  };
  subscription_id: string;
  event_type: string;
  schema_version: string;
  sent_at: string;
}

// Map Wise transfer states to our payment_status enum
function mapWiseState(
  wiseState: string
): 'processing' | 'completed' | 'failed' | 'cancelled' | null {
  switch (wiseState) {
    case 'outgoing_payment_sent':
    case 'funds_converted':
      return 'completed';
    case 'processing':
    case 'funds_refunded':
      return 'processing';
    case 'cancelled':
      return 'cancelled';
    case 'bounced_back':
    case 'charged_back':
      return 'failed';
    default:
      return null;
  }
}

// ────────────────────────────────────────────────────────────
// POST handler
// ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Read raw body for signature verification
  const rawBody = await request.text();

  // 2. Verify signature
  const signature = request.headers.get('X-Signature-SHA256') ?? '';
  if (!verifyWiseSignature(rawBody, signature)) {
    console.error('Wise webhook: invalid signature');
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  // 3. Parse the verified payload
  let payload: WiseWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WiseWebhookPayload;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    );
  }

  // 4. Only process transfer state change events
  if (payload.event_type !== 'transfers#state-change') {
    return NextResponse.json({ status: 'ignored' });
  }

  const transferId = payload.data.resource.id;
  const currentState = payload.data.current_state;

  // 5. Map the Wise state to our internal status
  const mappedStatus = mapWiseState(currentState);
  if (!mappedStatus) {
    // State we don't track — acknowledge and move on
    return NextResponse.json({ status: 'acknowledged' });
  }

  // 6. Update the ledger using service-role admin client
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: payment, error: lookupError } = await supabaseAdmin
    .from('wise_payments')
    .select('id, invoice_id, payment_status')
    .eq('wise_transfer_id', String(transferId))
    .single();

  if (lookupError || !payment) {
    // Transfer not found in our ledger — might be from a different system
    console.error(
      `Wise webhook: transfer ${transferId} not found in wise_payments`
    );
    return NextResponse.json({ status: 'not_found' });
  }

  // Don't overwrite a terminal state with a non-terminal one
  const terminalStates = ['completed', 'failed', 'cancelled'];
  if (terminalStates.includes(payment.payment_status)) {
    return NextResponse.json({ status: 'already_terminal' });
  }

  // 7. Update the payment record
  const updateData: Record<string, unknown> = {
    payment_status: mappedStatus,
  };

  if (mappedStatus === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  if (mappedStatus === 'failed' || mappedStatus === 'cancelled') {
    updateData.error_message = `Wise state: ${currentState}`;
  }

  await supabaseAdmin
    .from('wise_payments')
    .update(updateData)
    .eq('id', payment.id);

  // 8. If completed, also mark the invoice as paid
  if (mappedStatus === 'completed') {
    await supabaseAdmin
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment.invoice_id);
  }

  // 9. Audit log
  logActivity(supabaseAdmin, {
    userId: 'system',
    action: `WISE_WEBHOOK_${mappedStatus.toUpperCase()}`,
    tableName: 'wise_payments',
    recordId: payment.id,
    metadata: {
      wise_transfer_id: transferId,
      wise_state: currentState,
      mapped_status: mappedStatus,
    },
  });

  // 10. Return 200 instantly so Wise knows we received it
  return NextResponse.json({ status: 'ok' });
}
