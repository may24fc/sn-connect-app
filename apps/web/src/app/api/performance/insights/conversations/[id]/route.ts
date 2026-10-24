import { logActivity } from '@/lib/audit';
import {
  getConversation,
  listMessages,
  renameConversation,
  softDeleteConversation,
} from '@/lib/performance/insights/conversations';
import { buildSnapshotHash } from '@/lib/performance/insights/render';
import { loadInsightSource } from '@/lib/performance/insights/source';
import {
  performanceInsightConversationIdSchema,
  renamePerformanceInsightConversationSchema,
} from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { notFoundResponse, requireInsightAdmin } from '../../_lib';

type RouteContext = { params: Promise<{ id: string }> };

async function resolveId(context: RouteContext): Promise<string | null> {
  const { id } = await context.params;
  const parsed = performanceInsightConversationIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireInsightAdmin();
    if (!auth.ok) return auth.response;

    const id = await resolveId(context);
    if (!id) return notFoundResponse();

    const { supabase, supabaseAdmin } = auth.context;
    const conversation = await getConversation(supabase, id);
    if (!conversation) return notFoundResponse();

    const [messages, source] = await Promise.all([
      listMessages(supabase, id),
      loadInsightSource(supabase, supabaseAdmin, conversation.periodKey, conversation.monthsBack),
    ]);

    const currentSnapshotHash = buildSnapshotHash(source);
    const lastAnswer = [...messages]
      .reverse()
      .find((message) => message.role === 'assistant' && message.contextSnapshotHash);

    return NextResponse.json({
      data: {
        conversation,
        messages,
        currentSnapshotHash,
        isStale: Boolean(lastAnswer && lastAnswer.contextSnapshotHash !== currentSnapshotHash),
      },
    });
  } catch (error) {
    console.error('GET /api/performance/insights/conversations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireInsightAdmin();
    if (!auth.ok) return auth.response;

    const id = await resolveId(context);
    if (!id) return notFoundResponse();

    const parsed = renamePerformanceInsightConversationSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid conversation title', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const conversation = await renameConversation(auth.context.supabase, id, parsed.data.title);
    if (!conversation) return notFoundResponse();

    return NextResponse.json({ data: conversation });
  } catch (error) {
    console.error('PATCH /api/performance/insights/conversations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireInsightAdmin();
    if (!auth.ok) return auth.response;

    const id = await resolveId(context);
    if (!id) return notFoundResponse();

    const { supabase, supabaseAdmin, user } = auth.context;
    const conversation = await getConversation(supabase, id);
    if (!conversation) return notFoundResponse();

    await softDeleteConversation(supabase, id);

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'performance_insight_conversation_delete',
      tableName: 'performance_insight_conversations',
      recordId: id,
      metadata: {
        evaluation_kind: conversation.evaluationKind,
        period_key: conversation.periodKey,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/performance/insights/conversations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
