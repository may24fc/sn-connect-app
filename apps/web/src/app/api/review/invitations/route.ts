import { logActivity } from '@/lib/audit';
import { getAuthCallbackUrl } from '@/lib/auth/redirect-config';
import { getReviewSponsorContext } from '@/lib/review-access';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().trim().email(),
  purpose: z.string().trim().min(10).max(500),
  displayName: z.string().trim().min(2).max(120),
});

export async function POST(request: NextRequest) {
  const sponsor = await getReviewSponsorContext();
  if (!sponsor.userId) return NextResponse.json({ error: sponsor.error }, { status: 403 });

  const parsed = inviteSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid invitation' }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: activeEngagement } = await admin
    .from('review_engagements')
    .select('id, expires_at')
    .eq('status', 'active')
    .maybeSingle();
  if (activeEngagement) {
    return NextResponse.json(
      {
        error: 'Only one review engagement may be active at a time',
        activeUntil: activeEngagement.expires_at,
      },
      { status: 409 }
    );
  }

  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email.toLowerCase(),
    {
      redirectTo: `${getAuthCallbackUrl()}?next=/review`,
      data: { full_name: parsed.data.displayName, role: 'reviewer' },
    }
  );

  if (inviteError || !invite.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? 'Failed to invite reviewer' },
      { status: 500 }
    );
  }

  const reviewerId = invite.user.id;
  const { error: authMetadataError } = await admin.auth.admin.updateUserById(reviewerId, {
    app_metadata: { db_role: 'reviewer', account_kind: 'reviewer' },
    user_metadata: {
      ...(invite.user.user_metadata ?? {}),
      full_name: parsed.data.displayName,
      role: 'reviewer',
    },
  });
  if (authMetadataError) {
    await admin.auth.admin.deleteUser(reviewerId);
    return NextResponse.json({ error: 'Failed to secure reviewer identity' }, { status: 500 });
  }

  const { error: accountError } = await admin.from('users').insert({
    id: reviewerId,
    role: 'reviewer',
    account_kind: 'reviewer',
    account_purpose: parsed.data.purpose,
    sponsor_user_id: sponsor.userId,
    access_expires_at: expiresAt.toISOString(),
    status: 'active',
    created_by: sponsor.userId,
  });
  if (accountError) {
    await admin.auth.admin.deleteUser(reviewerId);
    return NextResponse.json({ error: 'Failed to create reviewer account' }, { status: 500 });
  }

  const { data: engagement, error: engagementError } = await admin
    .from('review_engagements')
    .insert({
      reviewer_user_id: reviewerId,
      sponsor_user_id: sponsor.userId,
      purpose: parsed.data.purpose,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single();
  if (engagementError) {
    await admin.from('users').delete().eq('id', reviewerId);
    await admin.auth.admin.deleteUser(reviewerId);
    return NextResponse.json({ error: 'Failed to create review engagement' }, { status: 500 });
  }

  logActivity(admin, {
    userId: sponsor.userId,
    action: 'CREATE REVIEW ENGAGEMENT',
    tableName: 'review_engagements',
    recordId: engagement.id,
    metadata: { expiresAt: expiresAt.toISOString() },
  });
  return NextResponse.json(
    { data: { engagementId: engagement.id, expiresAt: expiresAt.toISOString() } },
    { status: 201 }
  );
}
