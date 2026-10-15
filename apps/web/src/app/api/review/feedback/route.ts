import { logActivity } from '@/lib/audit';
import { getActiveReviewContext, getReviewSponsorContext } from '@/lib/review-access';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const feedbackSchema = z.object({
  route: z.string().startsWith('/review').max(300),
  category: z.enum(['usability', 'content', 'workflow', 'accessibility', 'idea', 'bug']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  suggestion: z.string().trim().min(10).max(4000),
  screenshotUrl: z.string().url().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const review = await getActiveReviewContext();
  if (!review.context) return NextResponse.json({ error: review.error }, { status: 403 });

  const parsed = feedbackSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid feedback', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('review_feedback')
    .insert({
      engagement_id: review.context.engagementId,
      reviewer_user_id: review.context.userId,
      route: parsed.data.route,
      category: parsed.data.category,
      severity: parsed.data.severity,
      suggestion: parsed.data.suggestion,
      screenshot_url: parsed.data.screenshotUrl ?? null,
    })
    .select('id, category, severity, suggestion, created_at')
    .single();

  if (error) return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  logActivity(admin, {
    userId: review.context.userId,
    action: 'CREATE REVIEW FEEDBACK',
    tableName: 'review_feedback',
    recordId: data.id,
    metadata: { category: data.category, severity: data.severity },
  });
  return NextResponse.json({ data }, { status: 201 });
}

export async function GET() {
  const sponsor = await getReviewSponsorContext();
  if (!sponsor.userId) return NextResponse.json({ error: sponsor.error }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('review_feedback')
    .select('id, engagement_id, route, category, severity, suggestion, screenshot_url, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Failed to load feedback' }, { status: 500 });
  return NextResponse.json({ data });
}
