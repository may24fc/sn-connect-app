import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';

import { normaliseRecoveryActionLink } from '@/lib/auth/recovery-link';
import { getPasswordResetRedirectUrl } from '@/lib/auth/redirect-config';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

const MAX_ATTEMPTS_PER_HOUR = 3;

const bodySchema = z.object({
  email: z.string().email('Invalid email address'),
});

function buildResetEmailHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your SN Connect password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#4F46E5;padding:28px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">SN Connect</p>
              <p style="margin:4px 0 0;font-size:12px;color:#c7d2fe;">HR Portal · Where Policy Meets Productivity</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.01em;">Reset your password</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
                Someone requested a password reset for your SN Connect account. If this was you, click the button below to choose a new password.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#4F46E5;border-radius:6px;">
                    <a href="${resetUrl}" target="_blank"
                      style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Expiry notice -->
              <p style="margin:0 0 24px;font-size:13px;color:#a1a1aa;">
                This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will not change.
              </p>
              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #f4f4f5;margin:0 0 24px;" />
              <!-- Fallback URL -->
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                If the button does not work, copy and paste this link into your browser:<br />
                <a href="${resetUrl}" style="color:#4F46E5;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;border-top:1px solid #f4f4f5;padding:20px 40px;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                SN Group International &nbsp;·&nbsp; This is an automated message, please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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

  // Generate a recovery link via Supabase admin (bypasses Supabase email pipeline).
  // We send the email ourselves via Resend for: branded HTML, proper DKIM, better deliverability.
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });

  const recoveryActionLink = linkData?.properties?.action_link
    ? normaliseRecoveryActionLink(linkData.properties.action_link, redirectTo)
    : null;

  let emailSent = false;
  let emailError: string | null = null;

  // Only attempt to send if the user exists (linkData will be null for unknown emails).
  // We still return success either way — no email enumeration.
  if (!linkError && recoveryActionLink) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const { error: sendError } = await resend.emails.send({
          from: 'Account Security <no-reply@sngroup.com.au>',
          to: email,
          subject: 'Reset your SN Connect password',
          html: buildResetEmailHtml(recoveryActionLink),
        });
        if (sendError) {
          emailError = sendError.message;
          console.error('[forgot-password] Resend send error:', sendError);
        } else {
          emailSent = true;
        }
      } catch (err) {
        emailError = err instanceof Error ? err.message : 'Unknown send error';
        console.error('[forgot-password] Resend exception:', emailError);
      }
    } else {
      console.warn('[forgot-password] RESEND_API_KEY not configured — email not sent.');
      emailError = 'RESEND_API_KEY not configured';
    }
  } else if (linkError) {
    // User not found or other Supabase error — silent fail (no enumeration)
    console.warn('[forgot-password] generateLink error (may be unknown email):', linkError.message);
  }

  // Log the attempt to audit_logs regardless of outcome
  await adminClient.from('audit_logs').insert({
    table_name: 'auth',
    record_id: null,
    operation: 'PASSWORD_RESET_REQUEST',
    new_values: {
      email,
      redirect_to: redirectTo,
      generated_action_link: linkData?.properties?.action_link ?? null,
      email_action_link: recoveryActionLink,
      email_sent: emailSent,
      error: emailError,
    },
    created_by: null,
  });

  // Always return success (no email enumeration)
  return NextResponse.json({ success: true });
}
