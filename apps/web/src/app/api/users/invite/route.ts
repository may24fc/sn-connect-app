import { logActivity } from '@/lib/audit';
import { getLoginUrl } from '@/lib/auth/redirect-config';
import { sendUserInviteEmail } from '@/lib/email';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['employee', 'intern'], { required_error: 'Role must be employee or intern' }),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  departmentId: z.string().uuid().optional(),
  position: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

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

    if (userRecord.role !== 'admin' && userRecord.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can invite users' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = inviteUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { role, firstName, lastName, departmentId, position } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    const existingAuthUser = await findAuthUserByEmail(supabaseAdmin, email);

    // Generate a temporary password (user should change on first login)
    const temporaryPassword = generateTemporaryPassword();

    let invitedUserId: string;
    let isReinvite = false;

    if (existingAuthUser) {
      const { data: existingUserRecord, error: existingUserError } = await supabaseAdmin
        .from('users')
        .select('status')
        .eq('id', existingAuthUser.id)
        .single();

      if (existingUserError && existingUserError.code !== 'PGRST116') {
        console.error('Error checking existing user profile:', existingUserError);
        return NextResponse.json({ error: 'Failed to validate existing user' }, { status: 500 });
      }

      // Existing active users should not be re-invited through onboarding.
      if (existingUserRecord?.status && existingUserRecord.status !== 'pending_onboarding') {
        return NextResponse.json(
          { error: 'A user with this email already exists and is already onboarded' },
          { status: 409 }
        );
      }

      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        existingAuthUser.id,
        {
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            ...(existingAuthUser.user_metadata ?? {}),
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            role,
          },
        }
      );

      if (updateAuthError) {
        console.error('Error updating existing auth user:', updateAuthError);
        return NextResponse.json(
          { error: 'Failed to refresh user invite', details: updateAuthError.message },
          { status: 500 }
        );
      }

      invitedUserId = existingAuthUser.id;
      isReinvite = true;
    } else {
      // Create auth user (using admin client)
      const { data: newAuthUser, error: createAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: temporaryPassword,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            role,
          },
        });

      if (createAuthError || !newAuthUser.user) {
        console.error('Error creating auth user:', createAuthError);
        return NextResponse.json(
          { error: 'Failed to create auth user', details: createAuthError?.message },
          { status: 500 }
        );
      }

      invitedUserId = newAuthUser.user.id;
    }

    // Upsert public.users record with pending_onboarding status.
    // A DB trigger already auto-creates public.users on auth.users insert,
    // so plain insert can fail with duplicate PK on retries/new invites.
    const { error: createUserError } = await supabaseAdmin.from('users').upsert(
      {
        id: invitedUserId,
        role,
        status: 'pending_onboarding',
        department_id: departmentId || null,
        created_by: user.id,
        deleted_at: null,
      },
      { onConflict: 'id' }
    );

    if (createUserError) {
      console.error('Error creating public user:', createUserError);
      // Rollback only for newly created auth users.
      if (!isReinvite) {
        await supabaseAdmin.auth.admin.deleteUser(invitedUserId);
      }
      return NextResponse.json(
        { error: 'Failed to create user profile', details: createUserError.message },
        { status: 500 }
      );
    }

    // Create or refresh onboarding profile with pre-filled data.
    const { error: createProfileError } = await supabaseAdmin.from('onboarding_profiles').upsert(
      {
        user_id: invitedUserId,
        first_name: firstName,
        last_name: lastName,
        email_address: email,
        position: position || null,
        department_id: departmentId || null,
        is_completed: false,
        completed_at: null,
        current_step: 'personal_info',
        deleted_at: null,
      },
      { onConflict: 'user_id' }
    );

    if (createProfileError) {
      console.error('Error creating onboarding profile:', createProfileError);
      // Continue anyway - the user can create their profile on first login
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'invite_user',
      tableName: 'users',
      recordId: invitedUserId,
      metadata: { email, role, reinvite: isReinvite },
    });

    // Best-effort email delivery: invite should still succeed even if provider fails.
    const loginUrl = getLoginUrl();
    const inviteEmailResult = await sendUserInviteEmail({
      to: email,
      firstName,
      role,
      temporaryPassword,
      loginUrl,
    });

    if (!inviteEmailResult.sent) {
      console.warn('Invite created, but invite email failed:', inviteEmailResult.error);
    }

    return NextResponse.json(
      {
        message: 'User invited successfully',
        data: {
          userId: invitedUserId,
          email,
          temporaryPassword, // Return this so admin can share with the new user
          role,
          reinvite: isReinvite,
          emailSent: inviteEmailResult.sent,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/users/invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function findAuthUserByEmail(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  email: string
): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const matchedUser = users.find(
      (authUser) => authUser.email?.trim().toLowerCase() === normalizedEmail
    );

    if (matchedUser) {
      return matchedUser;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

function generateTemporaryPassword(): string {
  // Generate a secure 12-character password with mix of characters
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%&*';

  const all = uppercase + lowercase + numbers + special;

  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = 4; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
