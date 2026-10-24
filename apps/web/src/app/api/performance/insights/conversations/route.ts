import { listConversations } from '@/lib/performance/insights/conversations';
import { performanceInsightConversationListQuerySchema } from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { requireInsightAdmin } from '../_lib';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInsightAdmin();
    if (!auth.ok) return auth.response;

    const parsed = performanceInsightConversationListQuerySchema.safeParse({
      evaluationKind: request.nextUrl.searchParams.get('evaluationKind'),
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      offset: request.nextUrl.searchParams.get('offset') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid conversation query', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await listConversations(auth.context.supabase, {
      userId: auth.context.user.id,
      kind: parsed.data.evaluationKind,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('GET /api/performance/insights/conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
