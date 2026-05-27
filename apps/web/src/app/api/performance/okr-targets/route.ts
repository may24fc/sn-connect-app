import { createOKRTargetSchema, updateOKRTargetSchema } from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedPerformanceContext, isPerformanceAdmin, resolveEmployeeIdForUser } from '../_lib';
import { syncOkrComputedState } from '../_okr-state';

export async function GET(request: NextRequest) {
  try {
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const okrId = searchParams.get('okrId') || undefined;
    const cycleId = searchParams.get('cycleId') || undefined;
    const explicitEmployeeId = searchParams.get('employeeId') || undefined;

    let employeeId: string | null | undefined = explicitEmployeeId;
    if (!(employeeId || isPerformanceAdmin(role))) {
      employeeId = await resolveEmployeeIdForUser(supabaseAdmin, user.id);
      if (!employeeId) {
        return NextResponse.json({ data: [] });
      }
    }

    let query = supabaseAdmin
      .from('okr_targets')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(500);

    if (okrId) {
      query = query.eq('okr_id', okrId);
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (cycleId) {
      query = query.eq('cycle_id', cycleId);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      console.error('GET /api/performance/okr-targets error:', queryError);
      return NextResponse.json({ error: 'Failed to fetch targets' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('GET /api/performance/okr-targets error:', err);
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
    const parsed = createOKRTargetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let employeeId: string | null | undefined = parsed.data.employeeId;

    if (!isPerformanceAdmin(role)) {
      const ownEmployeeId = await resolveEmployeeIdForUser(supabaseAdmin, user.id);
      if (!ownEmployeeId) {
        return NextResponse.json({ error: 'No employee profile found' }, { status: 400 });
      }
      employeeId = ownEmployeeId;
    } else if (!employeeId) {
      // For admin, look up from the OKR
      const { data: okr } = await supabaseAdmin
        .from('okrs')
        .select('employee_id, cycle_id')
        .eq('id', parsed.data.okrId)
        .single();

      if (!okr) {
        return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
      }
      employeeId = okr.employee_id;
    }

    // Get cycle_id from OKR if not provided
    let cycleId = parsed.data.cycleId;
    if (!cycleId) {
      const { data: okr } = await supabaseAdmin
        .from('okrs')
        .select('cycle_id')
        .eq('id', parsed.data.okrId)
        .single();
      cycleId = okr?.cycle_id ?? null;
    }

    const insertPayload: Record<string, unknown> = {
      okr_id: parsed.data.okrId,
      employee_id: employeeId,
      cycle_id: cycleId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      metric_type: parsed.data.metricType,
      start_value: parsed.data.startValue,
      target_value: parsed.data.targetValue,
      current_value: parsed.data.currentValue,
      unit: parsed.data.unit || null,
      weight: parsed.data.weight,
      sort_order: parsed.data.sortOrder,
    };

    // Attach rubric descriptors if provided
    if (parsed.data.rubric1) insertPayload.rubric_1 = parsed.data.rubric1;
    if (parsed.data.rubric2) insertPayload.rubric_2 = parsed.data.rubric2;
    if (parsed.data.rubric3) insertPayload.rubric_3 = parsed.data.rubric3;
    if (parsed.data.rubric4) insertPayload.rubric_4 = parsed.data.rubric4;

    const { data, error: insertError } = await supabaseAdmin
      .from('okr_targets')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError || !data) {
      console.error('POST /api/performance/okr-targets insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create target' }, { status: 500 });
    }

    await syncOkrComputedState(supabaseAdmin, data.okr_id);

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('POST /api/performance/okr-targets error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateOKRTargetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.currentValue !== undefined && !isPerformanceAdmin(role)) {
      const { count: evidenceCount, error: evidenceError } = await supabaseAdmin
        .from('okr_target_evidence')
        .select('id', { count: 'exact', head: true })
        .eq('okr_target_id', parsed.data.id)
        .is('deleted_at', null);

      if (evidenceError) {
        console.error('PATCH /api/performance/okr-targets evidence check error:', evidenceError);
        return NextResponse.json(
          { error: 'Failed to verify supporting attachment requirement' },
          { status: 500 }
        );
      }

      if (!evidenceCount) {
        return NextResponse.json(
          { error: 'A supporting attachment or link is required before updating progress.' },
          { status: 400 }
        );
      }
    }

    const payload: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) payload.name = parsed.data.name;
    if (parsed.data.description !== undefined) payload.description = parsed.data.description;
    if (parsed.data.metricType !== undefined) payload.metric_type = parsed.data.metricType;
    if (parsed.data.startValue !== undefined) payload.start_value = parsed.data.startValue;
    if (parsed.data.targetValue !== undefined) payload.target_value = parsed.data.targetValue;
    if (parsed.data.currentValue !== undefined) payload.current_value = parsed.data.currentValue;
    if (parsed.data.unit !== undefined) payload.unit = parsed.data.unit;
    if (parsed.data.weight !== undefined) payload.weight = parsed.data.weight;
    if (parsed.data.sortOrder !== undefined) payload.sort_order = parsed.data.sortOrder;
    if (parsed.data.adminRating !== undefined) payload.admin_rating = parsed.data.adminRating;
    if (parsed.data.adminComments !== undefined) payload.admin_comments = parsed.data.adminComments;
    if (parsed.data.evaluatedBy !== undefined) payload.evaluated_by = parsed.data.evaluatedBy;
    if (parsed.data.evaluatedAt !== undefined) payload.evaluated_at = parsed.data.evaluatedAt;
    if (parsed.data.rubric1 !== undefined) payload.rubric_1 = parsed.data.rubric1;
    if (parsed.data.rubric2 !== undefined) payload.rubric_2 = parsed.data.rubric2;
    if (parsed.data.rubric3 !== undefined) payload.rubric_3 = parsed.data.rubric3;
    if (parsed.data.rubric4 !== undefined) payload.rubric_4 = parsed.data.rubric4;
    if (parsed.data.selfRating !== undefined) payload.self_rating = parsed.data.selfRating;

    const { data, error: updateError } = await supabaseAdmin
      .from('okr_targets')
      .update(payload)
      .eq('id', parsed.data.id)
      .select('*')
      .single();

    if (updateError || !data) {
      console.error('PATCH /api/performance/okr-targets update error:', updateError);
      return NextResponse.json({ error: 'Failed to update target' }, { status: 500 });
    }

    await syncOkrComputedState(supabaseAdmin, data.okr_id);

    return NextResponse.json({ data });
  } catch (err) {
    console.error('PATCH /api/performance/okr-targets error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabaseAdmin, user, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing target id' }, { status: 400 });
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from('okr_targets')
      .select('okr_id')
      .eq('id', id)
      .maybeSingle();

    if (targetError) {
      console.error('DELETE /api/performance/okr-targets lookup error:', targetError);
      return NextResponse.json({ error: 'Failed to resolve target' }, { status: 500 });
    }

    if (!target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 });
    }

    // Soft delete
    const { error: deleteError } = await supabaseAdmin
      .from('okr_targets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) {
      console.error('DELETE /api/performance/okr-targets error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete target' }, { status: 500 });
    }

    await syncOkrComputedState(supabaseAdmin, target.okr_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/performance/okr-targets error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
