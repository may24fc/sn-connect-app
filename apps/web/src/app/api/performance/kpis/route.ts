import { createKPISchema, updateKPISchema } from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  getAuthedPerformanceContext,
  isPerformanceAdmin,
  resolveEmployeeIdForUser,
} from '../_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const cycleId = searchParams.get('cycleId') || undefined;
    const explicitEmployeeId = searchParams.get('employeeId') || undefined;

    let employeeId: string | null | undefined = explicitEmployeeId;
    if (!employeeId && !isPerformanceAdmin(role)) {
      // Use admin client for employee lookup to avoid RLS failures
      employeeId = await resolveEmployeeIdForUser(supabaseAdmin, user.id);
      if (!employeeId) {
        return NextResponse.json({ data: [] });
      }
    }

    // Use admin client to bypass RLS cross-table subquery failures.
    let query = supabaseAdmin.from('kpis').select('*').order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (cycleId) {
      query = query.eq('cycle_id', cycleId);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch KPIs' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/performance/kpis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createKPISchema.safeParse(body);

    if (!parsed.success) {
      console.error('POST /api/performance/kpis validation error:', JSON.stringify(parsed.error.flatten()));
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let employeeId = parsed.data.employeeId;

    if (!isPerformanceAdmin(role)) {
      // Use admin client—regular client's employee query may return null due to RLS
      const ownEmployeeId = await resolveEmployeeIdForUser(supabaseAdmin, user.id);
      if (!ownEmployeeId) {
        return NextResponse.json({ error: 'No employee profile found' }, { status: 400 });
      }
      employeeId = ownEmployeeId;
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('kpis')
      .insert({
        employee_id: employeeId,
        cycle_id: parsed.data.cycleId || null,
        name: parsed.data.name,
        target_value: parsed.data.targetValue,
        current_value: parsed.data.currentValue,
        unit: parsed.data.unit || null,
        period_start: parsed.data.periodStart,
        period_end: parsed.data.periodEnd,
      })
      .select('*')
      .single();

    if (insertError || !data) {
      return NextResponse.json({ error: 'Failed to create KPI' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/performance/kpis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabaseAdmin, user, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateKPISchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) payload.name = parsed.data.name;
    if (parsed.data.targetValue !== undefined) payload.target_value = parsed.data.targetValue;
    if (parsed.data.currentValue !== undefined) payload.current_value = parsed.data.currentValue;
    if (parsed.data.unit !== undefined) payload.unit = parsed.data.unit;
    if (parsed.data.periodStart !== undefined) payload.period_start = parsed.data.periodStart;
    if (parsed.data.periodEnd !== undefined) payload.period_end = parsed.data.periodEnd;
    if (parsed.data.status !== undefined) payload.status = parsed.data.status;
    if (parsed.data.adminRating !== undefined) payload.admin_rating = parsed.data.adminRating;
    if (parsed.data.adminComments !== undefined) payload.admin_comments = parsed.data.adminComments;
    if (parsed.data.evaluatedBy !== undefined) payload.evaluated_by = parsed.data.evaluatedBy;
    if (parsed.data.evaluatedAt !== undefined) payload.evaluated_at = parsed.data.evaluatedAt;

    const { data, error: updateError } = await supabaseAdmin
      .from('kpis')
      .update(payload)
      .eq('id', parsed.data.id)
      .select('*')
      .single();

    if (updateError || !data) {
      return NextResponse.json({ error: 'Failed to update KPI' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/performance/kpis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
