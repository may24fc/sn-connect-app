import {
  createReviewCycleSchema,
  updateReviewCycleSchema,
} from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedPerformanceContext, isPerformanceAdmin } from '../_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;

    let query = supabase.from('review_cycles').select('*').order('start_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch review cycles' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/performance/cycles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPerformanceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createReviewCycleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('review_cycles')
      .insert({
        name: parsed.data.name,
        description: parsed.data.description || null,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
        self_review_deadline: parsed.data.selfReviewDeadline || null,
        manager_review_deadline: parsed.data.managerReviewDeadline || null,
        status: parsed.data.status,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (insertError || !data) {
      return NextResponse.json({ error: 'Failed to create review cycle' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/performance/cycles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPerformanceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateReviewCycleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) payload.name = parsed.data.name;
    if (parsed.data.description !== undefined) payload.description = parsed.data.description;
    if (parsed.data.startDate !== undefined) payload.start_date = parsed.data.startDate;
    if (parsed.data.endDate !== undefined) payload.end_date = parsed.data.endDate;
    if (parsed.data.selfReviewDeadline !== undefined)
      payload.self_review_deadline = parsed.data.selfReviewDeadline;
    if (parsed.data.managerReviewDeadline !== undefined)
      payload.manager_review_deadline = parsed.data.managerReviewDeadline;
    if (parsed.data.status !== undefined) payload.status = parsed.data.status;

    const { data, error: updateError } = await supabase
      .from('review_cycles')
      .update(payload)
      .eq('id', parsed.data.id)
      .select('*')
      .single();

    if (updateError || !data) {
      return NextResponse.json({ error: 'Failed to update review cycle' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/performance/cycles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPerformanceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Cycle id is required' }, { status: 400 });
    }

    const { error: deleteError } = await supabase.from('review_cycles').delete().eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete review cycle' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/performance/cycles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
