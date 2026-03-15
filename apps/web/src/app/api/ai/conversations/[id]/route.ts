import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedSupabase } from '../../_lib';

const renameSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
});

// PATCH /api/ai/conversations/[id] — rename a conversation
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, error: authError } = await getAuthedSupabase();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json();
  const parsed = renameSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .update({ title: parsed.data.title })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select('id, title, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to rename conversation' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

// DELETE /api/ai/conversations/[id] — soft-delete a conversation
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, error: authError } = await getAuthedSupabase();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from('ai_conversations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
