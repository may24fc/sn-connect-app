import {
  generatePerformanceEvaluationSummarySchema,
  performanceEvaluationSummaryQuerySchema,
} from '@/lib/schemas/performance.schema';
import {
  generatePerformanceEvaluationSummary,
  getPerformanceEvaluationSummary,
} from '@/lib/performance/evaluation-summary';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthedPerformanceContext, isPerformanceAdmin } from '../_lib';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Local dev bypass: set ALLOW_LOCAL_SUMMARY_BYPASS=1 and send header 'x-local-bypass: 1'
    if (process.env.ALLOW_LOCAL_SUMMARY_BYPASS === '1' && request.headers.get('x-local-bypass') === '1') {
      const supabaseAdmin = createSupabaseAdminClient();
      const parsed = performanceEvaluationSummaryQuerySchema.safeParse({
        evaluationKind: request.nextUrl.searchParams.get('evaluationKind'),
        periodKey: request.nextUrl.searchParams.get('periodKey'),
      });

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid summary query', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const result = await getPerformanceEvaluationSummary(
        supabaseAdmin,
        parsed.data.evaluationKind,
        parsed.data.periodKey
      );

      return NextResponse.json({ data: result });
    }
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPerformanceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = performanceEvaluationSummaryQuerySchema.safeParse({
      evaluationKind: request.nextUrl.searchParams.get('evaluationKind'),
      periodKey: request.nextUrl.searchParams.get('periodKey'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid summary query', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await getPerformanceEvaluationSummary(
      supabaseAdmin,
      parsed.data.evaluationKind,
      parsed.data.periodKey
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('GET /api/performance/evaluation-summaries error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Local dev bypass: set ALLOW_LOCAL_SUMMARY_BYPASS=1 and send header 'x-local-bypass: 1'
    if (process.env.ALLOW_LOCAL_SUMMARY_BYPASS === '1' && request.headers.get('x-local-bypass') === '1') {
      const supabaseAdmin = createSupabaseAdminClient();
      const body = await request.json();
      const parsed = generatePerformanceEvaluationSummarySchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid summary payload', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const summary = await generatePerformanceEvaluationSummary(supabaseAdmin, 'dev-runner', parsed.data);
      return NextResponse.json({ data: summary });
    }
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPerformanceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = generatePerformanceEvaluationSummarySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid summary payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const summary = await generatePerformanceEvaluationSummary(supabaseAdmin, user.id, parsed.data);
    return NextResponse.json({ data: summary });
  } catch (error) {
    console.error('POST /api/performance/evaluation-summaries error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      {
        status:
          error instanceof Error && error.message.includes('No submitted evaluations') ? 400 : 500,
      }
    );
  }
}