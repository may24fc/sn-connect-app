import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { DivisionInsert } from '@hr-portal/database';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '50', 10);

    let query = supabase
      .from('divisions')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('name');

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching divisions:', error);
      return NextResponse.json({ error: 'Failed to fetch divisions' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/divisions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: DivisionInsert = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Division name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('divisions')
      .insert({
        ...body,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating division:', error);

      if (error.code === '23505') {
        return NextResponse.json({ error: 'Division name already exists' }, { status: 409 });
      }

      return NextResponse.json({ error: 'Failed to create division' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/divisions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}