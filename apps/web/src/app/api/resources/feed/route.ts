import { resourceFeedFiltersSchema } from '@/lib/schemas/resource.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '../_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = resourceFeedFiltersSchema.safeParse({
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const filters = parsed.data;

    // Get user's department for targeting
    const { data: userData } = await supabase
      .from('users')
      .select('department_id')
      .eq('id', user.id)
      .single();

    const userDepartmentId = userData?.department_id;

    // Build query - resources must be:
    // 1. Published
    // 2. Not expired
    // 3. Targeted to this user (public OR matching role/department/employee)
    let query = supabase
      .from('resources')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .is('deleted_at', null)
      .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('is_pinned', { ascending: false })
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false });

    // Apply search
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Note: `category`, `resourceType`, and `tags` were removed from feed filters

    // Legacy filters `resourceType` and `tags` are accepted but ignored server-side
    // if (filters.resourceType) {
    //   query = query.eq('resource_type', filters.resourceType);
    // }
    // if (filters.tags && filters.tags.length > 0) {
    //   query = query.overlaps('tags', filters.tags);
    // }

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    const { data, error: listError, count } = await query.range(from, to);

    if (listError) {
      console.error('Error fetching resource feed:', listError);
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }

    // Filter by targeting (RLS should handle this, but double-check)
    const filteredData = (data || []).filter(
      (resource: {
        is_public?: boolean;
        target_roles: string[];
        target_departments?: string[];
        target_employees?: string[];
      }) => {
        // Public resources are visible to all
        if (resource.is_public) return true;

        // Check role targeting
        if (resource.target_roles.length > 0 && role) {
          if (!resource.target_roles.includes(role)) {
            // Check if other criteria match
            if (
              (resource.target_departments?.length || 0) === 0 &&
              (resource.target_employees?.length || 0) === 0
            ) {
              return false;
            }
          } else {
            return true;
          }
        }

        // Check department targeting
        if ((resource.target_departments?.length || 0) > 0 && userDepartmentId) {
          if (resource.target_departments?.includes(userDepartmentId)) {
            return true;
          }
        }

        // Check employee targeting
        if ((resource.target_employees?.length || 0) > 0) {
          if (resource.target_employees?.includes(user.id)) {
            return true;
          }
        }

        // If no targeting, visible to all
        if (
          resource.target_roles.length === 0 &&
          (resource.target_departments?.length || 0) === 0 &&
          (resource.target_employees?.length || 0) === 0
        ) {
          return true;
        }

        return false;
      }
    );

    return NextResponse.json({
      data: filteredData,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/resources/feed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
