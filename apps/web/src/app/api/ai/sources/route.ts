import { createKnowledgeSourceSchema, knowledgeSourceFiltersSchema } from '@/lib/schemas/ai.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminClient, getAuthedSupabase, isAiAdmin } from '../_lib';

/** Transform a DB row to the KnowledgeSource shape the frontend expects */
function toKnowledgeSource(row: Record<string, unknown>) {
  const fileTypeMap: Record<string, string> = { pdf: 'pdf', docx: 'docx', txt: 'txt' };
  return {
    id: row.id,
    fileName: row.file_name || row.title,
    fileType: fileTypeMap[row.source_type as string] ?? 'pdf',
    uploadedAt: row.created_at,
    uploadedBy: row.created_by ?? 'system',
    status: row.processing_status ?? 'ready',
    accessLevel: row.access_level ?? 'all',
    title: row.title,
    description: row.description,
    sourceType: row.source_type,
    filePath: row.file_path,
    tags: row.tags ?? [],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAiAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = knowledgeSourceFiltersSchema.safeParse({
      search: searchParams.get('search') || undefined,
      sourceType: searchParams.get('sourceType') || undefined,
      isActive: searchParams.get('isActive') || undefined,
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
    const adminClient = getAdminClient();

    let query = adminClient
      .from('knowledge_sources')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });

    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }
    if (filters.sourceType) {
      query = query.eq('source_type', filters.sourceType);
    }
    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    const { data, error: listError, count } = await query.range(from, to);

    if (listError) {
      console.error('Error fetching knowledge sources:', listError);
      return NextResponse.json({ error: 'Failed to fetch knowledge sources' }, { status: 500 });
    }

    const transformed = (data ?? []).map((row) => toKnowledgeSource(row as Record<string, unknown>));

    return NextResponse.json({
      data: transformed,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/ai/sources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAiAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createKnowledgeSourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const adminClient = getAdminClient();

    const { data, error: createError } = await adminClient
      .from('knowledge_sources')
      .insert({
        title: payload.title,
        description: payload.description || null,
        source_type: payload.sourceType,
        content: payload.content || null,
        file_path: payload.filePath || null,
        url: payload.url || null,
        tags: payload.tags,
        is_active: payload.isActive,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (createError || !data) {
      console.error('Error creating knowledge source:', createError);
      return NextResponse.json({ error: 'Failed to create knowledge source' }, { status: 500 });
    }

    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'create_knowledge_source',
      resource_type: 'knowledge_source',
      resource_id: data.id,
      details: { title: payload.title, source_type: payload.sourceType },
    });

    return NextResponse.json({ data: toKnowledgeSource(data as Record<string, unknown>) }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/ai/sources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
