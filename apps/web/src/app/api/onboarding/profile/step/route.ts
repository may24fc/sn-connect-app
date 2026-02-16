import {
  paymentInfoSchema,
  personalInfoSchema,
  updateOnboardingStepSchema,
} from '@/lib/schemas/onboarding.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedOnboardingContext } from '../../_lib';

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
      updatePayload.company_email = payload.companyEmail;
      updatePayload.department_id = payload.departmentId ?? null;
      updatePayload.start_date = payload.startDate ?? null;
      updatePayload.nationality = payload.nationality ?? null;
      updatePayload.contact_number = payload.contactNumber ?? null;
      updatePayload.email_address = payload.emailAddress ?? null;
      updatePayload.education = payload.education ?? null;
      updatePayload.major = payload.major ?? null;
      updatePayload.birthday = payload.birthday ?? null;
      updatePayload.age = payload.age ?? null;
      updatePayload.address = payload.address ?? null;
      updatePayload.emergency_contact_name = payload.emergencyContactName ?? null;
      updatePayload.emergency_contact_number = payload.emergencyContactNumber ?? null;
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
      updatePayload.payment_account_name = payload.paymentAccountName;
      updatePayload.payment_account_number = payload.paymentAccountNumber;
      updatePayload.payment_email = payload.paymentEmail ?? null;
      updatePayload.payment_phone_number = payload.paymentPhoneNumber ?? null;
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

    return NextResponse.json({ data: saved });
  } catch (error) {
    console.error('PATCH /api/onboarding/profile/step error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
