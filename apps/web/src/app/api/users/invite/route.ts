import { logActivity } from '@/lib/audit';
import { getLoginUrl } from '@/lib/auth/redirect-config';
import { sendUserInviteEmail } from '@/lib/email';
import { createNotification, getUserDisplayName } from '@/lib/notifications/create-notification';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveDepartmentById, resolveDivisionById } from '../_organization';

const inviteableRoles = ['employee', 'intern', 'admin', 'super_admin'] as const;
const privilegedInviteRoles = ['admin', 'super_admin'] as const;

const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(inviteableRoles, {
    required_error: 'Role must be employee, intern, admin, or super_admin',
  }),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  departmentId: z.string().uuid().optional(),
  divisionId: z.string().uuid().optional(),
  position: z.string().optional(),
  probationMode: z.enum(['under_probation', 'no_probation']).optional(),
  probationAuto90: z.boolean().optional(),
  probationEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const body = await request.json();
    const parsed = inviteUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      role,
      firstName,
      lastName,
      departmentId,
      divisionId,
      position,
      probationMode,
      probationAuto90,
      probationEndDate,
    } = parsed.data;

    const isPrivilegedInvite = privilegedInviteRoles.includes(
      role as (typeof privilegedInviteRoles)[number]
    );
    const requiresOnboarding = !isPrivilegedInvite;
    const inviteProbationMode = role === 'employee' ? (probationMode ?? 'under_probation') : 'no_probation';
    const inviteProbationAuto90 = role === 'employee' ? (probationAuto90 ?? true) : false;
    const inviteProbationEndDate =
      role === 'employee'
        ? inviteProbationMode === 'under_probation'
          ? inviteProbationAuto90
            ? null
            : (probationEndDate ?? null)
          : null
        : null;

    if (
      role === 'employee' &&
      inviteProbationMode === 'under_probation' &&
      !inviteProbationAuto90 &&
      !inviteProbationEndDate
    ) {
      return NextResponse.json(
        {
          error:
            'Validation failed: probationEndDate is required when probation is manual',
        },
        { status: 400 }
      );
    }

    if (isPrivilegedInvite && userRecord.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only super admins can invite admin or super_admin users' },
        { status: 403 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    const nextStatus = isPrivilegedInvite ? 'active' : 'pending_onboarding';
    const existingAuthUser = await findAuthUserByEmail(supabaseAdmin, email);
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
          app_metadata: {
            ...(existingAuthUser.app_metadata ?? {}),
            db_role: role,
          },
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
      const { data: newAuthUser, error: createAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: temporaryPassword,
          email_confirm: true,
          app_metadata: {
            provider: 'email',
            providers: ['email'],
            db_role: role,
          },
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

    const { error: createUserError } = await supabaseAdmin.from('users').upsert(
      {
        id: invitedUserId,
        role,
        status: nextStatus,
        department_id: departmentId || null,
        division_id: divisionId || null,
        created_by: user.id,
        deleted_at: null,
      },
      { onConflict: 'id' }
    );

    if (createUserError) {
      console.error('Error creating public user:', createUserError);
      if (!isReinvite) {
        await supabaseAdmin.auth.admin.deleteUser(invitedUserId);
      }
      return NextResponse.json(
        { error: 'Failed to create user profile', details: createUserError.message },
        { status: 500 }
      );
    }

    if (isPrivilegedInvite) {
      const departmentName = departmentId
        ? (await resolveDepartmentById(supabaseAdmin, departmentId)).name
        : 'Unassigned';
      const divisionName = divisionId
        ? (await resolveDivisionById(supabaseAdmin, divisionId)).name
        : null;

      const { data: existingEmployee } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('user_id', invitedUserId)
        .is('deleted_at', null)
        .maybeSingle();

      if (!existingEmployee?.id) {
        const { error: createEmployeeError } = await supabaseAdmin.from('employees').insert({
          user_id: invitedUserId,
          employee_number: generateEmployeeNumber(),
          first_name: firstName,
          last_name: lastName,
          date_hired: new Date().toISOString().slice(0, 10),
          employment_type: 'regular',
          work_arrangement: 'full_time',
          position: position || formatRoleLabel(role),
          department: departmentName,
          division: divisionName,
          company_email: email,
          created_by: user.id,
        });

        if (createEmployeeError) {
          console.error('Error creating employee profile for privileged invite:', createEmployeeError);
          if (!isReinvite) {
            await supabaseAdmin.auth.admin.deleteUser(invitedUserId);
          }
          return NextResponse.json(
            { error: 'Failed to create employee profile', details: createEmployeeError.message },
            { status: 500 }
          );
        }
      }

      await supabaseAdmin
        .from('onboarding_profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', invitedUserId)
        .is('deleted_at', null);
    } else {
      const { error: createProfileError } = await supabaseAdmin.from('onboarding_profiles').upsert(
        {
          user_id: invitedUserId,
          first_name: firstName,
          last_name: lastName,
          email_address: email,
          position: position || null,
          department_id: departmentId || null,
          division_id: divisionId || null,
          is_completed: false,
          completed_at: null,
          current_step: 'personal_info',
          invite_probation_mode: inviteProbationMode,
          invite_probation_auto_90: inviteProbationAuto90,
          invite_probation_end_date: inviteProbationEndDate,
          deleted_at: null,
        },
        { onConflict: 'user_id' }
      );

      if (createProfileError) {
        console.error('Error creating onboarding profile:', createProfileError);
      }
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'invite_user',
      tableName: 'users',
      recordId: invitedUserId,
      metadata: {
        email,
        role,
        reinvite: isReinvite,
        departmentId: departmentId ?? null,
        divisionId: divisionId ?? null,
        inviteProbationMode,
        inviteProbationAuto90,
        inviteProbationEndDate,
      },
    });

    const inviterName = await getUserDisplayName(user.id);

    createNotification({
      userId: invitedUserId,
      type: 'system',
      title: isReinvite ? 'Your invite was refreshed' : 'You have been invited to SN Connect',
      message: requiresOnboarding
        ? `${inviterName} invited you to SN Connect. Sign in to complete your onboarding steps.`
        : `${inviterName} invited you to SN Connect. Your account is ready to use.`,
      link: getInviteNotificationLink(role, requiresOnboarding),
      metadata: {
        invitedBy: user.id,
        invitedRole: role,
        reinvite: isReinvite,
        requiresOnboarding,
      },
      dedupeKey: `user-invite:${invitedUserId}:${isReinvite ? 'refresh' : 'new'}:${nextStatus}`,
      dedupeWindowHours: 1,
    });

    const loginUrl = getLoginUrl();
    const inviteEmailResult = await sendUserInviteEmail({
      to: email,
      firstName,
      role,
      temporaryPassword,
      loginUrl,
      requiresOnboarding,
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
          temporaryPassword,
          role,
          status: nextStatus,
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

function formatRoleLabel(role: (typeof inviteableRoles)[number]): string {
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getInviteNotificationLink(
  role: (typeof inviteableRoles)[number],
  requiresOnboarding: boolean
): string {
  if (requiresOnboarding) {
    return '/onboarding';
  }

  if (role === 'super_admin') {
    return '/super-admin/dashboard';
  }

  if (role === 'admin') {
    return '/admin/dashboard';
  }

  if (role === 'intern') {
    return '/intern/dashboard';
  }

  return '/dashboard';
}

function generateEmployeeNumber(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `EMP-${yyyy}${mm}${dd}-${random}`;
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
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%&*';
  const all = uppercase + lowercase + numbers + special;

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
