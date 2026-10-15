import { isReviewEnvironment } from '@/lib/environment';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

async function expireEngagements(request: NextRequest) {
  if (!isReviewEnvironment()) {
    return NextResponse.json(
      { error: 'Review expiry is unavailable in this environment' },
      { status: 404 }
    );
  }

  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data: expired, error } = await admin
    .from('review_engagements')
    .select('id, reviewer_user_id')
    .eq('status', 'active')
    .lte('expires_at', now);
  if (error)
    return NextResponse.json({ error: 'Failed to resolve expired engagements' }, { status: 500 });

  for (const engagement of expired ?? []) {
    await admin.auth.admin.updateUserById(engagement.reviewer_user_id, { ban_duration: '876000h' });
    await admin
      .from('review_engagements')
      .update({ status: 'expired', ended_at: now })
      .eq('id', engagement.id);
  }

  return NextResponse.json({ expired: expired?.length ?? 0 });
}

// Vercel Cron invokes scheduled routes with GET and `Authorization: Bearer $CRON_SECRET`.
export const GET = expireEngagements;
export const POST = expireEngagements;
