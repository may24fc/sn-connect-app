import { getActiveReviewContext } from '@/lib/review-access';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createItemSchema = z.object({
  kind: z.enum(['objective', 'task']),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1000).optional(),
});

export async function GET() {
  const review = await getActiveReviewContext();
  if (!review.context) return NextResponse.json({ error: review.error }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('review_demo_items')
    .select('id, kind, title, description, status, progress, created_by, created_at, updated_at')
    .order('kind')
    .order('created_at');

  if (error) return NextResponse.json({ error: 'Failed to load demo items' }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const review = await getActiveReviewContext();
  if (!review.context) return NextResponse.json({ error: review.error }, { status: 403 });

  const parsed = createItemSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid demo item', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('review_demo_items')
    .insert({ ...parsed.data, created_by: review.context.userId })
    .select('id, kind, title, description, status, progress, created_by, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: 'Failed to create demo item' }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
