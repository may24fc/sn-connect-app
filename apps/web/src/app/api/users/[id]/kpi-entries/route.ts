import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'hr', 'ceo', 'cos'];

/**
 * GET /api/users/[id]/kpi-entries
 * Returns KPI entries for a user. Self-access or admin access.
 * Query params: role_type, from_date, to_date, kpi_name
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization: self or admin
    const isSelf = user.id === targetUserId;
    if (!isSelf) {
      let role = user.app_metadata?.db_role as string | undefined;
      if (!role) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .is('deleted_at', null)
          .maybeSingle();
        role = userData?.role ?? undefined;
      }
      if (!role || !ADMIN_ROLES.includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const roleType = searchParams.get('role_type');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const kpiName = searchParams.get('kpi_name');

    let query = supabase
      .from('role_kpi_entries')
      .select('*')
      .eq('user_id', targetUserId)
      .order('entry_date', { ascending: false });

    if (roleType) query = query.eq('role_type', roleType);
    if (fromDate) query = query.gte('entry_date', fromDate);
    if (toDate) query = query.lte('entry_date', toDate);
    if (kpiName) query = query.eq('kpi_name', kpiName);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch KPI entries', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error('Error fetching KPI entries:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/users/[id]/kpi-entries
 * Create a KPI entry. Self-access only.
 * Body: { role_type, entry_date?, kpi_name, kpi_value, kpi_unit?, notes? }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only self can create entries
    if (user.id !== targetUserId) {
      return NextResponse.json(
        { error: 'Forbidden: can only create own KPI entries' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role_type, entry_date, kpi_name, kpi_value, kpi_unit, notes } = body;

    // Validation
    if (!role_type || typeof role_type !== 'string') {
      return NextResponse.json(
        { error: 'Validation error', details: 'role_type is required' },
        { status: 400 }
      );
    }
    if (!kpi_name || typeof kpi_name !== 'string') {
      return NextResponse.json(
        { error: 'Validation error', details: 'kpi_name is required' },
        { status: 400 }
      );
    }
    if (kpi_value === undefined || kpi_value === null || typeof kpi_value !== 'number') {
      return NextResponse.json(
        { error: 'Validation error', details: 'kpi_value is required and must be a number' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('role_kpi_entries')
      .upsert(
        {
          user_id: targetUserId,
          role_type,
          entry_date: entry_date || new Date().toISOString().split('T')[0],
          kpi_name,
          kpi_value,
          kpi_unit: kpi_unit || null,
          notes: notes || null,
        },
        { onConflict: 'user_id,role_type,entry_date,kpi_name' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create KPI entry', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Error creating KPI entry:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
