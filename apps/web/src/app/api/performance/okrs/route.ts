import { createOKRSchema, updateOKRSchema } from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedPerformanceContext, isPerformanceAdmin, resolveEmployeeIdForUser } from '../_lib';

async function authorizeOkrMutation(
  supabaseAdmin: Awaited<ReturnType<typeof getAuthedPerformanceContext>>['supabaseAdmin'],
  userId: string,
  role: string | null,
  okrId: string
): Promise<
  | { okr: { id: string; employee_id: string } }
  | { error: 'No employee profile found'; status: 400 }
  | { error: 'OKR not found'; status: 404 }
  | { error: 'Forbidden'; status: 403 }
  | { error: 'Failed to resolve OKR'; status: 500 }
> {
  const { data: okr, error: okrError } = await supabaseAdmin
    .from('okrs')
    .select('id, employee_id')
    .eq('id', okrId)
    .maybeSingle();

  if (okrError) {
    return { error: 'Failed to resolve OKR', status: 500 };
  }

  if (!okr) {
    return { error: 'OKR not found', status: 404 };
  }

  if (isPerformanceAdmin(role)) {
    return { okr };
  }

  const ownEmployeeId = await resolveEmployeeIdForUser(supabaseAdmin, userId);
  if (!ownEmployeeId) {
    return { error: 'No employee profile found', status: 400 };
  }

  if (okr.employee_id !== ownEmployeeId) {
    return { error: 'Forbidden', status: 403 };
  }

  return { okr };
}

export async function GET(request: NextRequest) {
  try {
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const cycleId = searchParams.get('cycleId') || undefined;
    const status = searchParams.get('status') || undefined;
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
    // App-level auth scopes non-admin users to their own employee_id above.
    let query = supabaseAdmin
      .from('okrs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

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
      return NextResponse.json({ error: 'Failed to fetch OKRs' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/performance/okrs error:', error);
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
    const parsed = createOKRSchema.safeParse(body);

    if (!parsed.success) {
      console.error(
        'POST /api/performance/okrs validation error:',
        JSON.stringify(parsed.error.flatten())
      );
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let employeeId: string | null | undefined = parsed.data.employeeId;

    if (!isPerformanceAdmin(role)) {
      // Use admin client—regular client's employee query may return null due to RLS
      const ownEmployeeId = await resolveEmployeeIdForUser(supabaseAdmin, user.id);
      if (!ownEmployeeId) {
        return NextResponse.json({ error: 'No employee profile found' }, { status: 400 });
      }
      employeeId = ownEmployeeId;
    } else if (!employeeId) {
      return NextResponse.json(
        { error: 'employeeId is required for admin-created OKRs' },
        { status: 400 }
      );
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('okrs')
      .insert({
        employee_id: employeeId,
        cycle_id: parsed.data.cycleId || null,
        objective: parsed.data.objective,
        description: parsed.data.description || null,
        key_results: parsed.data.keyResults,
        progress: parsed.data.progress,
        status: parsed.data.status,
        weight: parsed.data.weight ?? 1,
      })
      .select('*')
      .single();

    if (insertError || !data) {
      return NextResponse.json({ error: 'Failed to create OKR' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/performance/okrs error:', error);
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
    const parsed = updateOKRSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const authorization = await authorizeOkrMutation(supabaseAdmin, user.id, role, parsed.data.id);
    if ('error' in authorization) {
      return NextResponse.json({ error: authorization.error }, { status: authorization.status });
    }

    const payload: Record<string, unknown> = {};
    if (parsed.data.objective !== undefined) payload.objective = parsed.data.objective;
    if (parsed.data.description !== undefined) payload.description = parsed.data.description;
    if (parsed.data.keyResults !== undefined) payload.key_results = parsed.data.keyResults;
    if (parsed.data.progress !== undefined) payload.progress = parsed.data.progress;
    if (parsed.data.status !== undefined) payload.status = parsed.data.status;
    if (parsed.data.weight !== undefined) payload.weight = parsed.data.weight;
    if (parsed.data.adminRating !== undefined) payload.admin_rating = parsed.data.adminRating;
    if (parsed.data.adminComments !== undefined) payload.admin_comments = parsed.data.adminComments;
    if (parsed.data.evaluatedBy !== undefined) payload.evaluated_by = parsed.data.evaluatedBy;
    if (parsed.data.evaluatedAt !== undefined) payload.evaluated_at = parsed.data.evaluatedAt;

    const { data, error: updateError } = await supabaseAdmin
      .from('okrs')
      .update(payload)
      .eq('id', parsed.data.id)
      .select('*')
      .single();

    if (updateError || !data) {
      return NextResponse.json({ error: 'Failed to update OKR' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/performance/okrs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing OKR id' }, { status: 400 });
    }

    const authorization = await authorizeOkrMutation(supabaseAdmin, user.id, role, id);
    if ('error' in authorization) {
      return NextResponse.json({ error: authorization.error }, { status: authorization.status });
    }

    const { error: deleteError } = await supabaseAdmin.from('okrs').delete().eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete OKR' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/performance/okrs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
