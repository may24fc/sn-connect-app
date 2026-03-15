import { type NextRequest, NextResponse } from 'next/server';
import { getLeaveAuthedContext, isAdminRole } from './_lib';

const VALID_LEAVE_TYPES = ['vacation', 'sick', 'personal', 'bereavement', 'maternity', 'paternity', 'unpaid'] as const;

// GET /api/leave-requests — list leave requests (own or all for admins)
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getLeaveAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, role } = auth.context;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20));
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    let query = supabaseAdmin
      .from('leave_requests')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Non-admin users can only see their own requests
    if (isAdminRole(role)) {
      if (userId) {
        query = query.eq('user_id', userId);
      }
    } else {
      query = query.eq('user_id', user.id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('[leave-requests] GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    });
  } catch (err) {
    console.error('[leave-requests] GET unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/leave-requests — create a new leave request
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getLeaveAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user } = auth.context;
    const body = await request.json();

    const { leave_type, start_date, end_date, reason } = body;

    // Validation
    const errors: string[] = [];
    if (!leave_type || !VALID_LEAVE_TYPES.includes(leave_type)) {
      errors.push(`leave_type must be one of: ${VALID_LEAVE_TYPES.join(', ')}`);
    }
    if (!start_date || Number.isNaN(Date.parse(start_date))) {
      errors.push('start_date is required and must be a valid date');
    }
    if (!end_date || Number.isNaN(Date.parse(end_date))) {
      errors.push('end_date is required and must be a valid date');
    }
    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      errors.push('end_date must be on or after start_date');
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      errors.push('reason is required (minimum 3 characters)');
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 422 });
    }

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        user_id: user.id,
        leave_type,
        start_date,
        end_date,
        reason: reason.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[leave-requests] POST error:', error);
      return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[leave-requests] POST unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
