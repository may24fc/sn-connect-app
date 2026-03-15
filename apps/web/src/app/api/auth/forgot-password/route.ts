import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getPasswordResetRedirectUrl } from '@/lib/auth/redirect-config';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

const MAX_ATTEMPTS_PER_HOUR = 3;

const bodySchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: Request): Promise<NextResponse> {
  let email = '';

  try {
    const body: unknown = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'E002-VALIDATION',
            message: 'Please enter a valid email address.',
            action: 'Fix the email and try again.',
          },
        },
        { status: 400 }
      );
    }

    email = parsed.data.email.toLowerCase().trim();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'E002-VALIDATION',
          message: 'Invalid request body.',
          action: 'Try again.',
        },
      },
      { status: 400 }
    );
  }

  const adminClient = createSupabaseAdminClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Rate-limit: max 3 attempts per email per hour using audit_logs
  const { count: recentAttempts } = await adminClient
    .from('audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('operation', 'PASSWORD_RESET_REQUEST')
    .eq('table_name', 'auth')
    .gte('created_at', oneHourAgo)
    .contains('new_values', { email });

  if ((recentAttempts ?? 0) >= MAX_ATTEMPTS_PER_HOUR) {
    console.warn(`[forgot-password] Rate limit reached for email: ${email}`);
    // Still return success to prevent email enumeration
    return NextResponse.json({ success: true });
  }

  const redirectTo = getPasswordResetRedirectUrl();

  // Trigger Supabase password reset — always returns success to prevent email enumeration
  const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (resetError) {
    console.error('[forgot-password] Supabase reset error:', resetError);
  }

  // Log the attempt to audit_logs regardless of whether the email exists
  await adminClient.from('audit_logs').insert({
    table_name: 'auth',
    record_id: null,
    operation: 'PASSWORD_RESET_REQUEST',
    new_values: {
      email,
      redirect_to: redirectTo,
      success: !resetError,
      error: resetError?.message ?? null,
    },
    created_by: null,
  });

  // Always return success (no email enumeration)
  return NextResponse.json({ success: true });
}
