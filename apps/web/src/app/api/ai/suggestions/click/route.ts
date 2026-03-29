import { aiSuggestionClickSchema } from '@/lib/schemas/ai.schema';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, getAuthedSupabase, isAiAdmin } from '../../_lib';

export async function POST(request: NextRequest) {
  try {
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAiAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = aiSuggestionClickSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const adminClient = getAdminClient();

    const { error: insertError } = await adminClient.from('audit_logs').insert({
      table_name: 'ai_chat',
      record_id: user.id,
      operation: 'INSERT',
      performed_by: user.id,
      action: 'ai_chat_suggestion_click',
      metadata: {
        title: payload.label,
        suggestion_id: payload.suggestionId,
        prompt: payload.prompt,
        surface: payload.surface,
        path: payload.path,
        conversation_id: payload.conversationId ?? null,
        was_first_message: payload.wasFirstMessage ?? false,
      },
    });

    if (insertError) {
      console.error('Failed to log AI suggestion click:', insertError);
      return NextResponse.json({ error: 'Failed to track suggestion click' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in POST /api/ai/suggestions/click:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}