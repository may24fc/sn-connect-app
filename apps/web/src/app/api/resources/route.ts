import { logActivity } from '@/lib/audit';
import { createResourceSchema, resourceFiltersSchema } from '@/lib/schemas/resource.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin, normalizeExcerpt } from './_lib';
import { NOTIFICATION_ADMIN_ROLES } from '../notifications/_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can access the full resource list (including drafts, archived)
    // Allow any authenticated user to create a resource. Admins will publish instantly;
    // non-admin submissions are created in a pending-approval workflow.

    const isAdmin = isResourceAdmin(role);

    const searchParams = request.nextUrl.searchParams;
    const parsed = resourceFiltersSchema.safeParse({
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      authorId: searchParams.get('authorId') || undefined,
      isFeatured: searchParams.get('isFeatured') || undefined,
      isPinned: searchParams.get('isPinned') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      // Optional folder filter
      folderId: searchParams.get('folderId') || undefined,
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

    // Non-admin users should only see published resources
    if (!isAdmin) {
      query = query.eq('status', 'published').eq('is_public', true);
    }

    // Apply filters
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.authorId) query = query.eq('author_id', filters.authorId);
    if (filters.isFeatured !== undefined) query = query.eq('is_featured', filters.isFeatured);
    if (filters.isPinned !== undefined) query = query.eq('is_pinned', filters.isPinned);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) query = query.lte('created_at', filters.endDate);
    // Legacy filters accepted but ignored server-side
    // if (filters.resourceType) query = query.eq('resource_type', filters.resourceType);
    // if (filters.tags && filters.tags.length > 0) {
    //   query = query.overlaps('tags', filters.tags);
    // }

    // Filter by folder
    if (filters.folderId) {
      query = query.eq('folder_id', filters.folderId);
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

    // allow both admins and non-admins to create resources

    const body = await request.json();
    const parsed = createResourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const isAdmin = isResourceAdmin(role);

    const insertPayload: Record<string, any> = {
      title: payload.title,
      description: payload.description || null,
      excerpt: normalizeExcerpt(payload.description, payload.excerpt),
      // Legacy fields are accepted by the schema but should not be written
      // to the resources table as part of the removal plan.
      // resource_type: payload.resourceType,
      // category: payload.category,
      subcategory: payload.subcategory || null,
      // Optional folder association
      folder_id: payload.folderId || null,
      // tags: payload.tags,
      file_path: payload.filePath || null,
      external_url: payload.externalUrl || null,
      thumbnail_path: payload.thumbnailPath || null,
      file_size: payload.fileSize || null,
      mime_type: payload.mimeType || null,
      duration_seconds: payload.durationSeconds || null,
      expires_at: payload.expiresAt || null,
      target_roles: payload.targetRoles,
      target_departments: payload.targetDepartments,
      target_employees: payload.targetEmployees,
      is_featured: payload.isFeatured,
      is_pinned: payload.isPinned,
      display_order: payload.displayOrder,
      author_id: user.id,
      created_by: user.id,
    };

    // Admins: publish immediately (or honor scheduled publish); mark as approved
    if (isAdmin) {
      insertPayload.status = 'published';
      insertPayload.approval_status = 'approved';
      insertPayload.published_at = payload.publishedAt || new Date().toISOString();
      // respect explicit isPublic flag for admins, otherwise default to true
      insertPayload.is_public = payload.isPublic !== undefined ? payload.isPublic : true;
    } else {
      // Non-admin flow: draft + pending approval; default to company-visible
      insertPayload.status = 'draft';
      insertPayload.approval_status = 'pending_approval';
      insertPayload.published_at = null;
      insertPayload.is_public = true;
    }

    const { data, error: createError } = await supabase.from('resources').insert(insertPayload).select('*').single();

    if (createError || !data) {
      console.error('Error creating resource:', createError);
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'create_resource',
      tableName: 'resources',
      recordId: data.id,
      metadata: { title: data.title, resourceType: data.resource_type },
    });

    // If a non-admin submitted the resource, notify admins for review
    if (!isAdmin) {
      try {
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .in('role', NOTIFICATION_ADMIN_ROLES)
          .is('deleted_at', null);

        if (admins && admins.length > 0) {
          const notifications = admins.map((a: any) => ({
            user_id: a.id,
            type: 'resource_submitted',
            title: 'Resource submitted',
            message: `${user.email || user.id} submitted "${data.title}" for review`,
            link: `/admin/resources/${data.id}`,
            metadata: { resourceId: data.id, authorId: user.id },
          }));
          const { error: notifError } = await supabase.from('notifications').insert(notifications);
          if (notifError) console.error('Failed to insert submission notifications:', notifError);
        }
      } catch (err) {
        console.error('Notification error (submission):', err);
      }
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
