import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedSupabase } from '../_lib';

const createConversationSchema = z.object({
  title: z.string().min(1).max(255).optional().default('New conversation'),
});

// GET /api/ai/conversations — list user's conversations
export async function GET(request: NextRequest) {
  const { supabase, user, error: authError } = await getAuthedSupabase();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);

  const { data, error, count } = await supabase
    .from('ai_conversations')
    .select('id, title, created_at, updated_at', { count: 'exact' })
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }

  return NextResponse.json({ data, total: count ?? 0 });
}

// POST /api/ai/conversations — create a new conversation
export async function POST(request: NextRequest) {
  const { supabase, user, error: authError } = await getAuthedSupabase();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createConversationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      created_by: user.id,
    })
    .select('id, title, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
