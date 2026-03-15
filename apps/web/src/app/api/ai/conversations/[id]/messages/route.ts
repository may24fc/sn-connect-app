import { NextResponse } from 'next/server';
import { getAuthedSupabase } from '../../../_lib';

// GET /api/ai/conversations/[id]/messages — load messages for a conversation
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, error: authError } = await getAuthedSupabase();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify the conversation belongs to the user
  const { data: conv, error: convError } = await supabase
    .from('ai_conversations')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (convError || !conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('ai_messages')
    .select('id, role, content, citations, created_at')
    .eq('conversation_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
