import { getActiveReviewContext } from '@/lib/review-access';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateItemSchema = z
  .object({
    title: z.string().trim().min(2).max(180).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    status: z.enum(['not_started', 'in_progress', 'complete']).optional(),
    progress: z.number().int().min(0).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const review = await getActiveReviewContext();
  if (!review.context) return NextResponse.json({ error: review.error }, { status: 403 });

  const parsed = updateItemSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 });

  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('review_demo_items')
    .update(parsed.data)
    .eq('id', id)
    .select('id, kind, title, description, status, progress, created_by, created_at, updated_at')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Failed to update demo item' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Demo item not found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const review = await getActiveReviewContext();
  if (!review.context) return NextResponse.json({ error: review.error }, { status: 403 });

  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { data: item } = await admin
    .from('review_demo_items')
    .select('created_by')
    .eq('id', id)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: 'Demo item not found' }, { status: 404 });
  if (item.created_by !== review.context.userId) {
    return NextResponse.json({ error: 'Seeded examples cannot be deleted' }, { status: 403 });
  }

  const { error } = await admin.from('review_demo_items').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Failed to delete demo item' }, { status: 500 });
  return NextResponse.json({ success: true });
}
