import {
  type EmailSendResult,
  sendInquiryConfirmation,
  sendInquiryNotification,
} from '@/lib/email';
import {
  type RateLimitResult,
  buildInquiryFingerprint,
  claimInquiryFingerprint,
  consumeInquiryEmailLimits,
  consumeInquiryIpLimits,
  getTrustedInquiryClientIp,
  releaseInquiryFingerprint,
} from '@/lib/inquiries/abuse-controls';
import { inquirySchema, normalizeInquiry } from '@/lib/schemas/inquiry.schema';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const MINIMUM_FORM_COMPLETION_MS = 2000;
type AdminClient = ReturnType<typeof createSupabaseAdminClient>;
type GuardResult<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

function successResponse(): NextResponse {
  return NextResponse.json({ success: true }, { status: 201 });
}

function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(1, result.retryAfterSeconds);
  return NextResponse.json(
    {
      error: 'Too many requests. Please wait before trying again.',
      retryAfterSeconds: retryAfter,
    },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    }
  );
}

function unavailableResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Inquiry service is temporarily unavailable. Please try again later.' },
    { status: 503 }
  );
}

function logGuardFailure(stage: string, error: unknown): void {
  console.error(`[Inquiry] ${stage} unavailable`, {
    error: error instanceof Error ? error.message : 'Unknown guard error',
  });
}

async function initializeGuardedClient(request: NextRequest): Promise<GuardResult<AdminClient>> {
  try {
    const supabase = createSupabaseAdminClient();
    const clientIp = getTrustedInquiryClientIp(request);
    const ipLimit = await consumeInquiryIpLimits(supabase, clientIp);
    return ipLimit.allowed
      ? { ok: true, value: supabase }
      : { ok: false, response: rateLimitResponse(ipLimit) };
  } catch (error) {
    logGuardFailure('IP abuse guard', error);
    return { ok: false, response: unavailableResponse() };
  }
}

async function enforceEmailLimits(
  supabase: AdminClient,
  email: string
): Promise<GuardResult<null>> {
  try {
    const emailLimit = await consumeInquiryEmailLimits(supabase, email);
    return emailLimit.allowed
      ? { ok: true, value: null }
      : { ok: false, response: rateLimitResponse(emailLimit) };
  } catch (error) {
    logGuardFailure('Email abuse guard', error);
    return { ok: false, response: unavailableResponse() };
  }
}

async function claimUniqueInquiry(
  supabase: AdminClient,
  fingerprint: string
): Promise<GuardResult<null>> {
  try {
    const claimed = await claimInquiryFingerprint(supabase, fingerprint);
    if (!claimed) {
      console.info('[Inquiry] Duplicate submission silently suppressed');
      return { ok: false, response: successResponse() };
    }
    return { ok: true, value: null };
  } catch (error) {
    logGuardFailure('Deduplication guard', error);
    return { ok: false, response: unavailableResponse() };
  }
}

function isSilentlyTrappedSubmission(data: {
  company_website?: string | undefined;
  form_started_at?: number | undefined;
}): boolean {
  const elapsedMs =
    typeof data.form_started_at === 'number'
      ? Date.now() - data.form_started_at
      : Number.NEGATIVE_INFINITY;
  return (
    Boolean(data.company_website?.trim()) ||
    !data.form_started_at ||
    elapsedMs < MINIMUM_FORM_COMPLETION_MS
  );
}

function deliveryUpdate(prefix: 'internal_email' | 'confirmation_email', result: EmailSendResult) {
  if (result.sent) {
    return {
      [`${prefix}_status`]: 'sent',
      [`${prefix}_resend_id`]: result.id,
      [`${prefix}_error`]: null,
    };
  }

  return {
    [`${prefix}_status`]: 'failed',
    [`${prefix}_resend_id`]: null,
    [`${prefix}_error`]: result.error.slice(0, 500),
  };
}

async function releaseFailedClaim(supabase: AdminClient, fingerprint: string): Promise<void> {
  try {
    await releaseInquiryFingerprint(supabase, fingerprint);
  } catch (error) {
    console.error('[Inquiry] Failed to release deduplication claim', {
      error: error instanceof Error ? error.message : 'Unknown release error',
    });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }

  const clientResult = await initializeGuardedClient(request);
  if (!clientResult.ok) {
    return clientResult.response;
  }
  const supabase = clientResult.value;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 });
  }

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const emailResult = await enforceEmailLimits(supabase, parsed.data.email);
  if (!emailResult.ok) {
    return emailResult.response;
  }

  if (isSilentlyTrappedSubmission(parsed.data)) {
    console.info('[Inquiry] Submission silently suppressed by basic bot controls');
    return successResponse();
  }

  const inquiry = normalizeInquiry(parsed.data);
  const fingerprint = buildInquiryFingerprint(inquiry);

  const claimResult = await claimUniqueInquiry(supabase, fingerprint);
  if (!claimResult.ok) {
    return claimResult.response;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('public_inquiries')
    .insert({
      ...inquiry,
      source: 'www_quick_brief',
      internal_email_status: 'pending',
      confirmation_email_status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !inserted?.id) {
    console.error('[Inquiry] Database insert failed', {
      error: insertError?.message ?? 'No inserted inquiry ID returned',
    });
    await releaseFailedClaim(supabase, fingerprint);
    return NextResponse.json({ error: 'Failed to submit inquiry' }, { status: 500 });
  }

  const inquiryId = inserted.id;
  const [internalResult, confirmationResult] = await Promise.all([
    sendInquiryNotification({
      inquiryId,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      subject: inquiry.subject,
      message: inquiry.message,
    }),
    sendInquiryConfirmation({
      inquiryId,
      to: inquiry.email,
      subject: inquiry.subject,
    }),
  ]);

  const { error: deliveryUpdateError } = await supabase
    .from('public_inquiries')
    .update({
      ...deliveryUpdate('internal_email', internalResult),
      ...deliveryUpdate('confirmation_email', confirmationResult),
    })
    .eq('id', inquiryId);

  if (deliveryUpdateError) {
    console.error('[Inquiry] Failed to persist email delivery results', {
      inquiryId,
      error: deliveryUpdateError.message,
    });
  }

  console.info('[Inquiry] Submission stored', {
    inquiryId,
    internalEmailSent: internalResult.sent,
    confirmationEmailSent: confirmationResult.sent,
  });

  return successResponse();
}
