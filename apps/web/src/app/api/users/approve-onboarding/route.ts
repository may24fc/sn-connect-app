import { logActivity } from '@/lib/audit';
import { getLoginUrl } from '@/lib/auth/redirect-config';
import {
  createNotification,
  getUserDisplayName,
} from '@/lib/notifications/create-notification';
import { sendOnboardingDecisionEmail } from '@/lib/email';
import { WiseApiError, createRecipient } from '@/lib/wise/client';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const approveOnboardingSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  approved: z.boolean(),
  notes: z.string().optional(),
});

function isMissingOnboardingReviewColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? error.code : null;
  const message = 'message' in error ? error.message : null;

  return (
    code === 'PGRST204' &&
    typeof message === 'string' &&
    message.includes('onboarding_profiles') &&
    (
      message.includes('review_state') ||
      message.includes('rejection_notes') ||
      message.includes('rejected_at') ||
      message.includes('rejected_by') ||
      message.includes('rejection_count')
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super_admin
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has admin privileges (admin or super_admin roles after consolidation)
    const allowedRoles = ['admin', 'super_admin'];
    if (!allowedRoles.includes(userRecord.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can approve onboarding' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parsed = approveOnboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, approved, notes } = parsed.data;
    const supabaseAdmin = createSupabaseAdminClient();

    // Get the user's current status
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('id', userId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    if (targetUser.status !== 'awaiting_approval') {
      return NextResponse.json({ error: 'User is not awaiting approval' }, { status: 400 });
    }

    const { data: onboardingProfile } = await supabaseAdmin
      .from('onboarding_profiles')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    const { data: authUserResult, error: authUserFetchError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (authUserFetchError) {
      console.warn('Failed to resolve auth user email during onboarding decision:', authUserFetchError);
    }

    const candidateEmails = [
      onboardingProfile?.email_address ?? null,
      authUserResult?.user?.email ?? null,
    ]
      .map((email) => email?.trim().toLowerCase() ?? '')
      .filter((email, index, all) => email.length > 0 && all.indexOf(email) === index);

    const targetFirstName =
      onboardingProfile?.first_name ||
      authUserResult?.user?.user_metadata?.first_name ||
      '';
    const targetLastName =
      onboardingProfile?.last_name ||
      authUserResult?.user?.user_metadata?.last_name ||
      '';
    const firstName = targetFirstName || 'there';
    const targetEmail = candidateEmails[0] ?? '';

    const loginUrl = getLoginUrl();

    if (approved) {
      if (onboardingProfile) {
        const { error: reviewStateError } = await supabaseAdmin
          .from('onboarding_profiles')
          .update({
            review_state: null,
          })
          .eq('id', onboardingProfile.id);

        if (reviewStateError) {
          if (isMissingOnboardingReviewColumnError(reviewStateError)) {
            console.warn(
              'Skipping onboarding review state reset during approval because review-state columns are unavailable:',
              reviewStateError
            );
          } else {
            console.error(
              'Failed to clear onboarding review state during approval:',
              reviewStateError
            );
          }
        }
      }

      // Approve: Update user status to 'active'
      const { error: updateError } = await supabase
        .from('users')
        .update({ status: 'active' })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to activate user:', updateError);
        return NextResponse.json(
          { error: 'Failed to activate user', details: updateError.message },
          { status: 500 }
        );
      }

      // Track recipient creation status across conditional blocks
      let wiseRecipientId: string | null = null;
      let recipientCreationFailed = false;
      let recipientCreationError = '';

      // Create employee record if not exists, then map onboarding payment info
      // into employee_banking_info (including best-effort Wise recipient creation).
      if (onboardingProfile) {

        const { data: existingEmployee } = await supabaseAdmin
          .from('employees')
          .select('id')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .maybeSingle();

        let employeeId = existingEmployee?.id ?? null;

        if (!employeeId) {
          const employmentType = targetUser.role === 'intern' ? 'intern' : 'regular';

          const { data: createdEmployee, error: employeeError } = await supabaseAdmin
            .from('employees')
            .insert({
              user_id: userId,
              employee_number: generateEmployeeNumber(),
              first_name: onboardingProfile.first_name || 'N/A',
              middle_name: onboardingProfile.middle_name,
              last_name: onboardingProfile.last_name || 'N/A',
              birthday: onboardingProfile.birthday,
              date_hired: onboardingProfile.start_date || new Date().toISOString().slice(0, 10),
              employment_type: employmentType,
              work_arrangement: 'full_time',
              position: onboardingProfile.position || 'Employee',
              department: onboardingProfile.department_id ? 'Assigned Department' : 'Unassigned',
              payroll_account_name: onboardingProfile.payment_account_name,
              payroll_account_number: onboardingProfile.payment_account_number,
              phone: onboardingProfile.contact_number,
              emergency_contact_name: onboardingProfile.emergency_contact_name,
              emergency_contact_number: onboardingProfile.emergency_contact_number,
              personal_email: onboardingProfile.email_address,
              company_email: onboardingProfile.email_address,
              address: onboardingProfile.address,
              city: onboardingProfile.payment_city,
              province: onboardingProfile.payment_province,
              postal_code: onboardingProfile.payment_zipcode,
              created_by: user.id,
            })
            .select('id')
            .single();

          if (employeeError || !createdEmployee) {
            console.error('Failed to create employee record during approval:', employeeError);
            return NextResponse.json(
              { error: 'Failed to create employee record', details: employeeError?.message },
              { status: 500 }
            );
          }

          employeeId = createdEmployee.id;
        }

        // Build banking data from onboarding profile.
        const paymentCountryCode = String(onboardingProfile.payment_country_code || 'PH').toUpperCase();
        const paymentCurrency = resolveCurrencyFromCountry(paymentCountryCode);
        const accountHolderName = String(onboardingProfile.payment_account_name || '').trim();
        const accountNumber = String(onboardingProfile.payment_account_number || '').trim();
        const bankId =
          typeof onboardingProfile.payment_bank_id === 'string'
            ? onboardingProfile.payment_bank_id
            : null;
        const manualBankName =
          typeof onboardingProfile.payment_bank_name === 'string'
            ? onboardingProfile.payment_bank_name.trim()
            : '';

        let bankName = manualBankName || null;
        let bankCode: string | null = null;
        let swiftCode: string | null = null;

        if (bankId) {
          const { data: bankRow } = await supabaseAdmin
            .from('bank_registry')
            .select('bank_name, bank_code, swift_code')
            .eq('id', bankId)
            .maybeSingle();

          bankName = bankRow?.bank_name ?? bankName;
          bankCode = bankRow?.bank_code ?? null;
          swiftCode = bankRow?.swift_code ?? null;
        }

        const { data: existingBanking } = await supabaseAdmin
          .from('employee_banking_info')
          .select('wise_recipient_id')
          .eq('employee_id', employeeId)
          .is('deleted_at', null)
          .maybeSingle();

        wiseRecipientId =
          typeof existingBanking?.wise_recipient_id === 'string'
            ? existingBanking.wise_recipient_id
            : null;

        // Best effort: create Wise recipient from onboarding payment data when missing.
        if (!wiseRecipientId && accountHolderName && accountNumber) {
          const wisePayload = buildWiseRecipientDetails({
            paymentCountryCode,
            accountNumber,
            bankCode,
            swiftCode,
            city: onboardingProfile.payment_city || null,
            postCode: onboardingProfile.payment_zipcode || null,
          });

          if (!wisePayload) {
            // GCash, Maya, or account type without sufficient banking codes.
            // Cannot create a Wise recipient — banking info will be saved without recipient ID.
            recipientCreationFailed = true;
            recipientCreationError =
              paymentCountryCode === 'PH'
                ? `Philippine account requires a bank with a valid SWIFT/BIC code. GCash, Maya, and unregistered banks cannot be auto-mapped to Wise.`
                : `Insufficient banking data to create Wise recipient (missing bankCode and swiftCode).`;
            console.warn('Onboarding approval: skipping Wise recipient creation', {
              userId,
              employeeId,
              reason: recipientCreationError,
            });
          } else {
            try {
              const recipient = await createRecipient({
                accountHolderName,
                currency: paymentCurrency,
                type: wisePayload.type,
                details: wisePayload.details,
              });
              wiseRecipientId = String(recipient.id);
            } catch (recipientError) {
              recipientCreationFailed = true;
              const baseMessage =
                recipientError instanceof Error ? recipientError.message : String(recipientError);
              // Surface Wise's full validation error body for debugging.
              const wiseBody =
                recipientError instanceof WiseApiError ? recipientError.responseBody : null;
              const skipReason = getWiseRecipientApiFailureReason(recipientError);
              recipientCreationError = skipReason ?? (wiseBody
                ? `${baseMessage} — Wise response: ${wiseBody}`
                : baseMessage);

              console.warn(skipReason
                ? 'Onboarding approval: skipping Wise recipient creation'
                : 'Onboarding approval: failed to auto-create Wise recipient', {
                userId,
                employeeId,
                message: recipientCreationError,
                wiseResponseBody: wiseBody,
              });
            }
          }
        }

        if (accountHolderName && accountNumber) {
          const { error: bankingError } = await supabaseAdmin
            .from('employee_banking_info')
            .upsert(
              {
                employee_id: employeeId,
                wise_recipient_id: wiseRecipientId,
                account_holder_name: accountHolderName,
                bank_name: bankName,
                account_number: accountNumber,
                routing_number: bankCode,
                swift_code: swiftCode,
                account_type: 'bank_account',
                currency: paymentCurrency,
                country_code: paymentCountryCode,
                is_verified: Boolean(wiseRecipientId),
                verified_at: wiseRecipientId ? new Date().toISOString() : null,
                created_by: user.id,
              },
              { onConflict: 'employee_id' }
            );

          if (bankingError) {
            console.error('Failed to upsert employee banking info during approval:', bankingError);
            // Do not fail onboarding approval for banking sync issues.
          }
        }
      }

      logActivity(supabase, {
        userId: user.id,
        action: 'approve_onboarding',
        tableName: 'users',
        recordId: userId,
        metadata: {
          ...(targetFirstName ? { first_name: targetFirstName } : {}),
          ...(targetLastName ? { last_name: targetLastName } : {}),
          ...(targetEmail ? { email: targetEmail } : {}),
        },
      });

      // Notify user that their onboarding was approved
      const approverName = await getUserDisplayName(user.id);
      createNotification({
        userId,
        type: 'onboarding_approved',
        title: 'Onboarding Approved',
        message: `${approverName} approved your onboarding. Your account is now active!`,
        link: `/`,
        metadata: { approvedBy: user.id },
      });

      if (candidateEmails.length > 0) {
        await Promise.all(
          candidateEmails.map(async (to) => {
            const result = await sendOnboardingDecisionEmail({
              to,
              firstName,
              role: targetUser.role,
              decision: 'approved',
              loginUrl,
            });

            if (!result.sent) {
              console.warn('Onboarding approved email was not sent', { to, error: result.error });
            }
          })
        );
      }

      return NextResponse.json({
        message: 'Onboarding approved and user activated successfully',
        data: { userId, status: 'active' },
        recipient: {
          created: Boolean(wiseRecipientId),
          recipientId: wiseRecipientId || null,
          failed: recipientCreationFailed,
          error: recipientCreationError || null,
        },
      });
    } else {
      if (onboardingProfile) {
        const { error: rejectionStateError } = await supabaseAdmin
          .from('onboarding_profiles')
          .update({
            review_state: 'rejected',
            rejection_notes: notes || null,
            rejected_at: new Date().toISOString(),
            rejected_by: user.id,
            rejection_count: (onboardingProfile.rejection_count ?? 0) + 1,
          })
          .eq('id', onboardingProfile.id);

        if (rejectionStateError) {
          if (isMissingOnboardingReviewColumnError(rejectionStateError)) {
            return NextResponse.json(
              {
                error:
                  'Onboarding rejection tracking columns are unavailable. Apply the latest onboarding review-state migration before rejecting submissions.',
              },
              { status: 409 }
            );
          }

          console.error('Failed to persist onboarding rejection state:', rejectionStateError);
          return NextResponse.json(
            { error: 'Failed to save rejection state', details: rejectionStateError.message },
            { status: 500 }
          );
        }
      }

      logActivity(supabase, {
        userId: user.id,
        action: 'reject_onboarding',
        tableName: 'users',
        recordId: userId,
        metadata: {
          ...(targetFirstName ? { first_name: targetFirstName } : {}),
          ...(targetLastName ? { last_name: targetLastName } : {}),
          ...(targetEmail ? { email: targetEmail } : {}),
          ...(notes ? { notes } : {}),
        },
      });

      // Notify user that their onboarding was rejected
      const approverName = await getUserDisplayName(user.id);
      createNotification({
        userId,
        type: 'onboarding_rejected',
        title: 'Onboarding Rejected',
        message: `${approverName} rejected your onboarding${notes ? `. Reason: ${notes}` : ''}`,
        link: `/onboarding`,
        metadata: { rejectedBy: user.id, notes },
      });

      if (candidateEmails.length > 0) {
        await Promise.all(
          candidateEmails.map(async (to) => {
            const result = await sendOnboardingDecisionEmail({
              to,
              firstName,
              role: targetUser.role,
              decision: 'rejected',
              ...(notes ? { notes } : {}),
              loginUrl,
            });

            if (!result.sent) {
              console.warn('Onboarding rejected email was not sent', { to, error: result.error });
            }
          })
        );
      }

      return NextResponse.json({
        message: 'Onboarding rejected. User notified.',
        data: { userId, status: 'awaiting_approval', notes },
      });
    }
  } catch (error) {
    console.error('POST /api/users/approve-onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateEmployeeNumber(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `EMP-${yyyy}${mm}${dd}-${random}`;
}

function resolveCurrencyFromCountry(countryCode: string): string {
  const normalized = countryCode.toUpperCase();
  if (normalized === 'PH') return 'PHP';
  if (normalized === 'US') return 'USD';
  if (normalized === 'GB') return 'GBP';
  if (normalized === 'AU') return 'AUD';
  if (normalized === 'SG') return 'SGD';
  if (normalized === 'JP') return 'JPY';
  if (normalized === 'EU' || normalized === 'DE' || normalized === 'FR' || normalized === 'ES') {
    return 'EUR';
  }
  return 'USD';
}

/**
 * Build the recipient type + details payload for Wise `/v1/accounts`.
 * Returns null when creation should be skipped (e.g. GCash/Maya/missing codes).
 *
 * Philippines rules (type: 'philippines'):
 *   - Wise bankCode must be the BIC/SWIFT (e.g. 'BNORPHMM'), NOT the abbreviation ('BDO').
 *   - country / city / postCode are NOT accepted in details for this type.
 *   - GCash and Maya have no SWIFT code → skip, they need a wallet-specific API flow.
 *
 * IBAN-based rules (EU, UK, AU, US, SG, etc.):
 *   - Pass swiftCode + optional city/postCode in details.
 */
function buildWiseRecipientDetails(params: {
  paymentCountryCode: string;
  accountNumber: string;
  bankCode: string | null;
  swiftCode: string | null;
  city?: string | null;
  postCode?: string | null;
}): { type: string; details: Record<string, unknown> } | null {
  const { paymentCountryCode, accountNumber, swiftCode, bankCode } = params;

  if (!accountNumber) return null;

  if (paymentCountryCode === 'PH') {
    // Wise Philippines type requires BIC/SWIFT as bankCode.
    // GCash (GCASH), Maya (MAYA), and custom banks without a SWIFT code cannot
    // use this flow and must be handled separately (e-wallet API or manual entry).
    if (!swiftCode) return null;
    return {
      type: 'philippines',
      details: {
        legalType: 'PRIVATE',
        accountNumber,
        bankCode: swiftCode, // Wise uses SWIFT/BIC as the bank identifier for PH
      },
    };
  }

  if (!String(params.city ?? '').trim()) {
    return null;
  }

  // IBAN / international bank transfer
  return {
    type: 'iban',
    details: {
      legalType: 'PRIVATE',
      accountNumber,
      ...(swiftCode ? { swiftCode } : bankCode ? { bankCode } : {}),
      ...(params.city ? { city: params.city } : {}),
      ...(params.postCode ? { postCode: params.postCode } : {}),
    },
  };
}

function getWiseRecipientApiFailureReason(error: unknown): string | null {
  if (!(error instanceof WiseApiError)) {
    return null;
  }

  const responseBody = error.responseBody.toLowerCase();

  if (responseBody.includes('bank is not supported') && responseBody.includes('bankcode')) {
    return 'Selected bank is not currently supported by Wise for automatic recipient creation. Banking details were saved without a Wise recipient ID.';
  }

  if (responseBody.includes('please enter a city') || responseBody.includes('address.city')) {
    return 'Payment city is required before a Wise recipient can be created. Banking details were saved without a Wise recipient ID.';
  }

  return null;
}
