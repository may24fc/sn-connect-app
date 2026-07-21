import {
  performanceEvaluationDraftQuerySchema,
  upsertPerformanceEvaluationDraftSchema,
} from '@/lib/schemas/performance.schema';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthedPerformanceContext, resolveEmployeeIdForUser } from '../_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabaseAdmin, user, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = performanceEvaluationDraftQuerySchema.safeParse({
      evaluationKind: request.nextUrl.searchParams.get('evaluationKind'),
      cycleKey: request.nextUrl.searchParams.get('cycleKey'),
    });

    if (!parsed.success) {
      console.warn('GET /api/performance/drafts validation failed', {
        userId: user.id,
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          code: issue.code,
          message: issue.message,
        })),
      });
      return NextResponse.json(
        { error: 'Invalid draft query', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error: queryError } = await supabaseAdmin
      .from('performance_evaluation_drafts')
      .select('payload, updated_at')
      .eq('user_id', user.id)
      .eq('evaluation_kind', parsed.data.evaluationKind)
      .eq('cycle_key', parsed.data.cycleKey)
      .maybeSingle();

    if (queryError) {
      console.error('GET /api/performance/drafts error:', queryError);
      return NextResponse.json({ error: 'Failed to load evaluation draft' }, { status: 500 });
    }

    return NextResponse.json({
      data: data
        ? {
            values: (data.payload as Record<string, unknown>) ?? {},
            savedAt: data.updated_at,
          }
        : null,
    });
  } catch (error) {
    console.error('GET /api/performance/drafts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabaseAdmin, user, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = upsertPerformanceEvaluationDraftSchema.safeParse(body);

    if (!parsed.success) {
      console.warn('PUT /api/performance/drafts validation failed', {
        userId: user.id,
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          code: issue.code,
          message: issue.message,
        })),
      });
      return NextResponse.json(
        { error: 'Invalid draft payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const employeeId = await resolveEmployeeIdForUser(supabaseAdmin, user.id);
    const timestamp = new Date().toISOString();

    const { data, error: upsertError } = await supabaseAdmin
      .from('performance_evaluation_drafts')
      .upsert(
        {
          user_id: user.id,
          employee_id: employeeId,
          evaluation_kind: parsed.data.evaluationKind,
          cycle_key: parsed.data.cycleKey,
          payload: parsed.data.values,
          created_by: user.id,
          updated_at: timestamp,
        },
        {
          onConflict: 'user_id,evaluation_kind,cycle_key',
        }
      )
      .select('updated_at')
      .single();

    if (upsertError || !data) {
      console.error('PUT /api/performance/drafts error:', upsertError);
      return NextResponse.json({ error: 'Failed to save evaluation draft' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        savedAt: data.updated_at,
      },
    });
  } catch (error) {
    console.error('PUT /api/performance/drafts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabaseAdmin, user, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = performanceEvaluationDraftQuerySchema.safeParse({
      evaluationKind: request.nextUrl.searchParams.get('evaluationKind'),
      cycleKey: request.nextUrl.searchParams.get('cycleKey'),
    });

    if (!parsed.success) {
      console.warn('DELETE /api/performance/drafts validation failed', {
        userId: user.id,
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          code: issue.code,
          message: issue.message,
        })),
      });
      return NextResponse.json(
        { error: 'Invalid draft query', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('performance_evaluation_drafts')
      .delete()
      .eq('user_id', user.id)
      .eq('evaluation_kind', parsed.data.evaluationKind)
      .eq('cycle_key', parsed.data.cycleKey);

    if (deleteError) {
      console.error('DELETE /api/performance/drafts error:', deleteError);
      return NextResponse.json({ error: 'Failed to clear evaluation draft' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/performance/drafts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}