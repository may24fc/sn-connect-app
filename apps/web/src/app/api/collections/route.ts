import { createCollectionSchema } from '@/lib/schemas/resource.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin } from '../resources/_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const search = request.nextUrl.searchParams.get('search') || undefined;
    const page = Number(request.nextUrl.searchParams.get('page') || 1);
    const pageSize = Number(request.nextUrl.searchParams.get('pageSize') || 20);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('resource_collections')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error: listError, count } = await query.range(from, to);

    if (listError) {
      return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
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
    console.error('Unexpected error in GET /api/collections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createCollectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const { data, error: createError } = await supabase
      .from('resource_collections')
      .insert({
        title: payload.title,
        description: payload.description || null,
        thumbnail_path: payload.thumbnailPath || null,
        is_public: payload.isPublic,
        target_roles: payload.targetRoles,
        target_departments: payload.targetDepartments,
        author_id: user.id,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (createError || !data) {
      return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/collections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
