import { createResourceSchema, resourceFiltersSchema } from '@/lib/schemas/resource.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin, normalizeExcerpt } from './_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can access the full resource list (including drafts, archived)
    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = resourceFiltersSchema.safeParse({
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      resourceType: searchParams.get('resourceType') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      authorId: searchParams.get('authorId') || undefined,
      isFeatured: searchParams.get('isFeatured') || undefined,
      isPinned: searchParams.get('isPinned') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const filters = parsed.data;

    let query = supabase
      .from('resources')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('is_pinned', { ascending: false })
      .order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });

    // Apply filters
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.resourceType) query = query.eq('resource_type', filters.resourceType);
    if (filters.authorId) query = query.eq('author_id', filters.authorId);
    if (filters.isFeatured !== undefined) query = query.eq('is_featured', filters.isFeatured);
    if (filters.isPinned !== undefined) query = query.eq('is_pinned', filters.isPinned);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) query = query.lte('created_at', filters.endDate);
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    const { data, error: listError, count } = await query.range(from, to);

    if (listError) {
      console.error('Error fetching resources:', listError);
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/resources:', error);
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
    const parsed = createResourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const { data, error: createError } = await supabase
      .from('resources')
      .insert({
        title: payload.title,
        description: payload.description || null,
        excerpt: normalizeExcerpt(payload.description, payload.excerpt),
        resource_type: payload.resourceType,
        category: payload.category,
        subcategory: payload.subcategory || null,
        tags: payload.tags,
        file_path: payload.filePath || null,
        external_url: payload.externalUrl || null,
        thumbnail_path: payload.thumbnailPath || null,
        file_size: payload.fileSize || null,
        mime_type: payload.mimeType || null,
        duration_seconds: payload.durationSeconds || null,
        status: 'draft',
        published_at: payload.publishedAt || null,
        expires_at: payload.expiresAt || null,
        is_public: payload.isPublic,
        target_roles: payload.targetRoles,
        target_departments: payload.targetDepartments,
        target_employees: payload.targetEmployees,
        is_featured: payload.isFeatured,
        is_pinned: payload.isPinned,
        display_order: payload.displayOrder,
        author_id: user.id,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (createError || !data) {
      console.error('Error creating resource:', createError);
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
