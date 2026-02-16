import {
  createPerformanceReviewSchema,
  updatePerformanceReviewSchema,
} from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedPerformanceContext, isPerformanceAdmin, resolveEmployeeIdForUser } from '../_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const cycleId = searchParams.get('cycleId') || undefined;
    const status = searchParams.get('status') || undefined;
    const explicitEmployeeId = searchParams.get('employeeId') || undefined;

    let employeeId: string | null | undefined = explicitEmployeeId;
    if (!employeeId && !isPerformanceAdmin(role)) {
      employeeId = await resolveEmployeeIdForUser(supabase, user.id);
      if (!employeeId) {
        return NextResponse.json({ data: [] });
      }
    }

    let query = supabase
      .from('performance_reviews')
      .select('*, review_cycles(id, name, start_date, end_date, status), employees(id, first_name, last_name, department, immediate_head)')
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (cycleId) {
      query = query.eq('cycle_id', cycleId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch performance reviews' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/performance/reviews error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createPerformanceReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let employeeId = parsed.data.employeeId;
    if (!isPerformanceAdmin(role)) {
      const ownEmployeeId = await resolveEmployeeIdForUser(supabase, user.id);
      if (!ownEmployeeId) {
        return NextResponse.json({ error: 'No employee profile found' }, { status: 400 });
      }
      employeeId = ownEmployeeId;
    }

    const { data, error: insertError } = await supabase
      .from('performance_reviews')
      .insert({
        cycle_id: parsed.data.cycleId,
        employee_id: employeeId,
        reviewer_id: parsed.data.reviewerId || null,
        status: parsed.data.status,
        self_rating: parsed.data.selfRating || null,
        self_comments: parsed.data.selfComments || null,
        manager_rating: parsed.data.managerRating || null,
        manager_comments: parsed.data.managerComments || null,
        final_rating: parsed.data.finalRating || null,
        goals_for_next_period: parsed.data.goalsForNextPeriod || null,
      })
      .select('*')
      .single();

    if (insertError || !data) {
      return NextResponse.json({ error: 'Failed to create performance review' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/performance/reviews error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updatePerformanceReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) payload.status = parsed.data.status;
    if (parsed.data.reviewerId !== undefined) payload.reviewer_id = parsed.data.reviewerId;
    if (parsed.data.selfRating !== undefined) payload.self_rating = parsed.data.selfRating;
    if (parsed.data.selfComments !== undefined) payload.self_comments = parsed.data.selfComments;
    if (parsed.data.managerRating !== undefined) payload.manager_rating = parsed.data.managerRating;
    if (parsed.data.managerComments !== undefined)
      payload.manager_comments = parsed.data.managerComments;
    if (parsed.data.finalRating !== undefined) payload.final_rating = parsed.data.finalRating;
    if (parsed.data.goalsForNextPeriod !== undefined)
      payload.goals_for_next_period = parsed.data.goalsForNextPeriod;
    if (parsed.data.submittedAt !== undefined) payload.submitted_at = parsed.data.submittedAt;
    if (parsed.data.completedAt !== undefined) payload.completed_at = parsed.data.completedAt;

    const { data, error: updateError } = await supabase
      .from('performance_reviews')
      .update(payload)
      .eq('id', parsed.data.id)
      .select('*')
      .single();

    if (updateError || !data) {
      return NextResponse.json({ error: 'Failed to update performance review' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/performance/reviews error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
