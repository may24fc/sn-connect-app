import { logActivity } from '@/lib/audit';
import { completeOnboardingSchema } from '@/lib/schemas/onboarding.schema';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { WiseApiError, createRecipient } from '@/lib/wise/client';
import { type NextRequest, NextResponse } from 'next/server';

/** Roles that may use this self-service profile completion endpoint. */
const ALLOWED_ROLES = ['admin', 'super_admin', 'hr', 'cos', 'ceo'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = completeOnboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Resolve role
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (userError || !userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!ALLOWED_ROLES.includes(userRecord.role)) {
      return NextResponse.json(
        { error: 'Forbidden: This endpoint is for admin/leadership roles only' },
        { status: 403 }
      );
    }

    // Find the onboarding profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('onboarding_profiles')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Onboarding profile not found' }, { status: 404 });
    }

    // Mark profile as completed
    const { error: updateError } = await supabaseAdmin
      .from('onboarding_profiles')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        current_step: 'review',
      })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to complete profile' }, { status: 500 });
    }

    // Update the existing employee record with profile data.
    // Admin/super-admin users already have an employee record from the invite flow.
    const { data: existingEmployee } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingEmployee) {
      const { error: empUpdateError } = await supabaseAdmin
        .from('employees')
        .update({
          first_name: profile.first_name || undefined,
          middle_name: profile.middle_name || undefined,
          last_name: profile.last_name || undefined,
          birthday: profile.birthday || undefined,
          position: profile.position || undefined,
          phone: profile.contact_number || undefined,
          personal_email: profile.personal_email || undefined,
          emergency_contact_name: profile.emergency_contact_name || undefined,
          emergency_contact_number: profile.emergency_contact_number || undefined,
          address: profile.address || undefined,
          city: profile.payment_city || undefined,
          province: profile.payment_province || undefined,
          postal_code: profile.payment_zipcode || undefined,
          payroll_account_name: profile.payment_account_name || undefined,
          payroll_account_number: profile.payment_account_number || undefined,
        })
        .eq('id', existingEmployee.id);

      if (empUpdateError) {
        console.error('Failed to update employee record from admin profile setup:', empUpdateError);
        // Non-fatal — profile is already marked complete
      }

      // Upsert banking info if payment data is present (for admin roles, not super_admin)
      const accountHolderName = String(profile.payment_account_name || '').trim();
      const accountNumber = String(profile.payment_account_number || '').trim();

      if (accountHolderName && accountNumber) {
        const paymentCountryCode = String(profile.payment_country_code || 'PH').toUpperCase();
        const paymentCurrency = resolveCurrencyFromCountry(paymentCountryCode);
        const bankId =
          typeof profile.payment_bank_id === 'string' ? profile.payment_bank_id : null;
        const manualBankName =
          typeof profile.payment_bank_name === 'string'
            ? profile.payment_bank_name.trim()
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

        // Best-effort Wise recipient creation
        let wiseRecipientId: string | null = null;

        const { data: existingBanking } = await supabaseAdmin
          .from('employee_banking_info')
          .select('wise_recipient_id')
          .eq('employee_id', existingEmployee.id)
          .is('deleted_at', null)
          .maybeSingle();

        wiseRecipientId =
          typeof existingBanking?.wise_recipient_id === 'string'
            ? existingBanking.wise_recipient_id
            : null;

        if (!wiseRecipientId) {
          const wisePayload = buildWiseRecipientDetails({
            paymentCountryCode,
            accountNumber,
            bankCode,
            swiftCode,
          });

          if (wisePayload) {
            try {
              const recipient = await createRecipient({
                accountHolderName,
                currency: paymentCurrency,
                type: wisePayload.type,
                details: wisePayload.details,
              });
              wiseRecipientId = String(recipient.id);
            } catch (recipientError) {
              const baseMessage =
                recipientError instanceof Error
                  ? recipientError.message
                  : String(recipientError);
              const wiseBody =
                recipientError instanceof WiseApiError
                  ? recipientError.responseBody
                  : null;
              console.warn('Admin profile setup: failed to create Wise recipient', {
                userId: user.id,
                message: baseMessage,
                wiseResponseBody: wiseBody,
              });
            }
          }
        }

        const { error: bankingError } = await supabaseAdmin
          .from('employee_banking_info')
          .upsert(
            {
              employee_id: existingEmployee.id,
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
          console.error('Failed to upsert banking info during admin profile setup:', bankingError);
        }
      }
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'admin_profile_setup_complete',
      tableName: 'onboarding_profiles',
      recordId: profile.id,
      metadata: { role: userRecord.role },
    });

    return NextResponse.json({ data: { completed: true } });
  } catch (error) {
    console.error('POST /api/onboarding/profile/admin-complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helpers (shared with approve-onboarding) ──────────────────────────────────

function resolveCurrencyFromCountry(countryCode: string): string {
  const normalized = countryCode.toUpperCase();
  if (normalized === 'PH') return 'PHP';
  if (normalized === 'US') return 'USD';
  if (normalized === 'GB') return 'GBP';
  if (normalized === 'AU') return 'AUD';
  if (normalized === 'SG') return 'SGD';
  if (normalized === 'JP') return 'JPY';
  if (
    normalized === 'EU' ||
    normalized === 'DE' ||
    normalized === 'FR' ||
    normalized === 'ES'
  ) {
    return 'EUR';
  }
  return 'USD';
}

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
    if (!swiftCode) return null;
    return {
      type: 'philippines',
      details: {
        legalType: 'PRIVATE',
        accountNumber,
        bankCode: swiftCode,
      },
    };
  }

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
