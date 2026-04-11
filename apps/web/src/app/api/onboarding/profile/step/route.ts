import {
  paymentInfoSchema,
  personalInfoSchema,
  updateOnboardingStepSchema,
} from '@/lib/schemas/onboarding.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedOnboardingContext } from '../../_lib';

function formatPersonalAddress(parts: {
  streetAddress: string;
  city: string;
  province: string;
  country: string;
  zipcode: string;
}): string {
  const segments = [
    `Street: ${parts.streetAddress.trim()}`,
    `City: ${parts.city.trim()}`,
    `Province: ${parts.province.trim()}`,
    `Country: ${parts.country.trim()}`,
  ];

  const zipcode = parts.zipcode.trim();
  if (zipcode) {
    segments.push(`Zipcode: ${zipcode}`);
  }

  return segments.join(' | ');
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateOnboardingStepSchema.safeParse(body);

    if (!parsed.success) {
      console.error('PATCH /api/onboarding/profile/step validation error:', parsed.error);
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { step, data } = parsed.data;

    const updatePayload: Record<string, unknown> = {
      current_step: step,
    };

    if (step === 'personal_info') {
      const personalParsed = personalInfoSchema.safeParse(data);
      if (!personalParsed.success) {
        console.error('Personal info validation error:', personalParsed.error);
        return NextResponse.json(
          { error: 'Invalid personal info payload', details: personalParsed.error.flatten() },
          { status: 400 }
        );
      }

      const payload = personalParsed.data;
      updatePayload.first_name = payload.firstName;
      updatePayload.middle_name = payload.middleName ?? null;
      updatePayload.last_name = payload.lastName;
      updatePayload.position = payload.position;
      updatePayload.personal_email = payload.personalEmail;
      updatePayload.department_id = payload.departmentId ?? null;
      updatePayload.division_id = payload.divisionId ?? null;
      updatePayload.start_date = payload.startDate ?? null;
      updatePayload.nationality = payload.nationality ?? null;
      updatePayload.contact_number = payload.contactNumber ?? null;
      updatePayload.contact_country_code = payload.contactCountryCode ?? 'PH';
      updatePayload.email_address = payload.emailAddress ?? null;
      updatePayload.education = payload.education ?? null;
      updatePayload.major = payload.major ?? null;
      updatePayload.birthday = payload.birthday ?? null;
      updatePayload.age = payload.age ?? null;
      updatePayload.address = formatPersonalAddress({
        streetAddress: payload.streetAddress,
        city: payload.city,
        province: payload.province,
        country: payload.country,
        zipcode: String(payload.zipcode ?? ''),
      });
      updatePayload.emergency_contact_name = payload.emergencyContactName ?? null;
      updatePayload.emergency_contact_number = payload.emergencyContactNumber ?? null;
      updatePayload.emergency_contact_country_code =
        payload.emergencyContactCountryCode ?? 'PH';
      updatePayload.emergency_contact_email = payload.emergencyContactEmail ?? null;
      updatePayload.emergency_contact_relationship = payload.emergencyContactRelationship ?? null;
      updatePayload.linkedin_profile_url = payload.linkedinProfileUrl ?? null;
    }

    if (step === 'payment_info') {
      const paymentParsed = paymentInfoSchema.safeParse(data);
      if (!paymentParsed.success) {
        console.error('Payment info validation error:', paymentParsed.error);
        return NextResponse.json(
          { error: 'Invalid payment info payload', details: paymentParsed.error.flatten() },
          { status: 400 }
        );
      }

      const payload = paymentParsed.data;
      const selectedBankId =
        payload.paymentBankId && payload.paymentBankId !== 'OTHER' ? payload.paymentBankId : null;
      const providedBankName =
        typeof payload.paymentBankName === 'string' ? payload.paymentBankName.trim() : '';
      let resolvedBankName: string | null = providedBankName || null;

      if (selectedBankId) {
        const { data: bankRow, error: bankError } = await supabase
          .from('bank_registry')
          .select('bank_name')
          .eq('id', selectedBankId)
          .maybeSingle();

        if (bankError) {
          console.error('Failed to resolve payment bank from registry:', bankError);
          return NextResponse.json({ error: 'Failed to resolve selected bank' }, { status: 500 });
        }

        if (!bankRow?.bank_name) {
          return NextResponse.json({ error: 'Selected bank is invalid' }, { status: 400 });
        }

        resolvedBankName = bankRow.bank_name.trim();
      }

      updatePayload.payment_country_code = payload.paymentCountryCode ?? 'PH';
      updatePayload.payment_bank_id = selectedBankId;
      updatePayload.payment_bank_name = resolvedBankName;
      updatePayload.payment_account_name = payload.paymentAccountName;
      updatePayload.payment_account_number = payload.paymentAccountNumber;
      updatePayload.payment_email = payload.paymentEmail ?? null;
      updatePayload.payment_phone_number = payload.paymentPhoneNumber ?? null;
      updatePayload.payment_phone_country_code = payload.paymentPhoneCountryCode ?? 'PH';
      updatePayload.payment_address = payload.paymentAddress ?? null;
      updatePayload.payment_city = payload.paymentCity ?? null;
      updatePayload.payment_province = payload.paymentProvince ?? null;
      updatePayload.payment_zipcode = payload.paymentZipcode ?? null;
    }

    const { data: existing } = await supabase
      .from('onboarding_profiles')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    let saved;

    if (!existing?.id) {
      const { data: created, error: createError } = await supabase
        .from('onboarding_profiles')
        .insert({
          user_id: user.id,
          ...updatePayload,
        })
        .select('*')
        .single();

      if (createError || !created) {
        return NextResponse.json({ error: 'Failed to create onboarding profile' }, { status: 500 });
      }

      saved = created;
    } else {
      const { data: updated, error: updateError } = await supabase
        .from('onboarding_profiles')
        .update(updatePayload)
        .eq('id', existing.id)
        .select('*')
        .single();

      if (updateError || !updated) {
        return NextResponse.json({ error: 'Failed to update onboarding profile' }, { status: 500 });
      }

      saved = updated;
    }

    if (
      step === 'payment_info' &&
      updatePayload.payment_bank_id === null &&
      typeof updatePayload.payment_bank_name === 'string' &&
      updatePayload.payment_bank_name.trim().length > 0
    ) {
      await supabase.from('audit_logs').insert({
        table_name: 'onboarding_profiles',
        record_id: saved.id,
        operation: 'UPDATE',
        new_values: {
          payment_country_code: updatePayload.payment_country_code ?? null,
          payment_bank_name: updatePayload.payment_bank_name,
        },
        performed_by: user.id,
        action: 'bank_registry_other_selected',
        metadata: {
          source: 'onboarding_payment_info',
          payment_country_code: updatePayload.payment_country_code ?? null,
          payment_bank_name: updatePayload.payment_bank_name,
        },
      });
    }

    return NextResponse.json({ data: saved });
  } catch (error) {
    console.error('PATCH /api/onboarding/profile/step error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
