import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
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

    const { email, role, firstName, lastName, departmentId, position } = parsed.data;

    // Check if user already exists (using admin client)
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingAuthUser?.users.some((u: any) => u.email === email);

    if (userExists) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Generate a temporary password (user should change on first login)
    const temporaryPassword = generateTemporaryPassword();

    // Create auth user (using admin client)
    const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
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

    // Upsert public.users record with pending_onboarding status.
    // A DB trigger already auto-creates public.users on auth.users insert,
    // so plain insert can fail with duplicate PK on retries/new invites.
    const { error: createUserError } = await supabaseAdmin.from('users').upsert({
      id: newAuthUser.user.id,
      role,
      status: 'pending_onboarding',
      department_id: departmentId || null,
      created_by: user.id,
    }, { onConflict: 'id' });

    if (createUserError) {
      console.error('Error creating public user:', createUserError);
      // Rollback: delete auth user if public.users creation fails (using admin client)
      await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id);
      return NextResponse.json(
        { error: 'Failed to create user profile', details: createUserError.message },
        { status: 500 }
      );
    }

    // Create initial onboarding_profile with pre-filled data
    const { error: createProfileError } = await supabaseAdmin.from('onboarding_profiles').insert({
      user_id: newAuthUser.user.id,
      first_name: firstName,
      last_name: lastName,
      email_address: email,
      position: position || null,
      department_id: departmentId || null,
      is_completed: false,
      current_step: 'personal_info',
    });

    if (createProfileError) {
      console.error('Error creating onboarding profile:', createProfileError);
      // Continue anyway - the user can create their profile on first login
    }

    return NextResponse.json(
      {
        message: 'User invited successfully',
        data: {
          userId: newAuthUser.user.id,
          email,
          temporaryPassword, // Return this so admin can share with the new user
          role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/users/invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
