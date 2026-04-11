import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Partial profile info schema — all fields optional for inline editing.
 * Only validates non-empty strings where format matters (email, url, phone).
 */
const partialProfileSchema = z
  .object({
    nationality: z.string().max(120).optional(),
    contactNumber: z.string().max(30).optional(),
    personalEmail: z.union([z.string().email(), z.literal('')]).optional(),
    emailAddress: z.union([z.string().email(), z.literal('')]).optional(),
    companyEmail: z.union([z.string().email(), z.literal('')]).optional(),
    education: z.string().max(300).optional(),
    major: z.string().max(200).optional(),
    birthday: z.union([z.string().date(), z.literal('')]).optional(),
    age: z.union([z.number().int().min(0).max(120), z.null()]).optional(),
    address: z.string().max(500).optional(),
    emergencyContactName: z.string().max(120).optional(),
    emergencyContactNumber: z.string().max(30).optional(),
    emergencyContactRelationship: z.string().max(80).optional(),
    linkedinProfileUrl: z.union([z.string().url(), z.literal('')]).optional(),
  })
  .strict();

export type PartialProfileUpdate = z.infer<typeof partialProfileSchema>;

/** camelCase → snake_case field mapping */
const fieldMap: Record<string, string> = {
  nationality: 'nationality',
  contactNumber: 'contact_number',
  personalEmail: 'personal_email',
  emailAddress: 'email_address',
  companyEmail: 'company_email',
  education: 'education',
  major: 'major',
  birthday: 'birthday',
  age: 'age',
  address: 'address',
  emergencyContactName: 'emergency_contact_name',
  emergencyContactNumber: 'emergency_contact_number',
  emergencyContactRelationship: 'emergency_contact_relationship',
  linkedinProfileUrl: 'linkedin_profile_url',
};

/**
 * PATCH /api/profile/info
 * Partially update the current user's onboarding profile personal info.
 * Accepts any subset of profile fields — no "all required" constraint.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
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
    const parsed = partialProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Convert camelCase keys to snake_case DB columns
    const dbPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      const dbColumn = fieldMap[key];
      if (dbColumn) {
        // Treat empty strings as null for optional fields
        dbPayload[dbColumn] = value === '' ? null : value;
      }
    }

    if (Object.keys(dbPayload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Check if profile exists
    const { data: existing } = await supabase
      .from('onboarding_profiles')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    let saved;

    if (!existing?.id) {
      // Create a new profile row with the provided fields
      const { data: created, error: createError } = await supabase
        .from('onboarding_profiles')
        .insert({ user_id: user.id, ...dbPayload })
        .select('*')
        .single();

      if (createError || !created) {
        console.error('Error creating profile:', createError);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }
      saved = created;
    } else {
      const { data: updated, error: updateError } = await supabase
        .from('onboarding_profiles')
        .update(dbPayload)
        .eq('id', existing.id)
        .select('*')
        .single();

      if (updateError || !updated) {
        console.error('Error updating profile:', updateError);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }
      saved = updated;
    }

    return NextResponse.json({ data: saved });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/profile/info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
