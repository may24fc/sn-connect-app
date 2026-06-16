import { resourceSearchSchema } from '@/lib/schemas/resource.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '../_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = resourceSearchSchema.safeParse({
      query: searchParams.get('query') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { query, limit } = parsed.data;

    // Use Postgres full-text search
    // The search index should be: to_tsvector('english', title || ' ' || description || ' ' || array_to_string(tags, ' '))
    let dbQuery = supabase
      .from('resources')
      .select('*')
      .eq('status', 'published')
      .is('deleted_at', null)
      .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('view_count', { ascending: false })
      .limit(limit);

    // Legacy filter `resourceType` is accepted but ignored server-side
    // (no-op)

    const { data, error: searchError } = await dbQuery;

    if (searchError) {
      console.error('Error searching resources:', searchError);
      return NextResponse.json({ error: 'Failed to search resources' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Unexpected error in GET /api/resources/search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
