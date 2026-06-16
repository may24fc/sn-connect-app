import { logActivity } from '@/lib/audit';
import { createResourceSchema, resourceFiltersSchema } from '@/lib/schemas/resource.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin, normalizeExcerpt } from './_lib';
import { NOTIFICATION_ADMIN_ROLES } from '../notifications/_lib';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { mapMimeTypeToResourceType } from '@/lib/mux/server';
import { createNotificationsForUsers } from '@/lib/notifications/create-notification';

const DEFAULT_RESOURCE_CATEGORY = 'tools';

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

    // Build base query options
    const baseQuery = () =>
      supabase.from('resources').select('*', { count: 'exact' }).is('deleted_at', null);

    const applyCommonFilters = (q: any) => {
      // order will be applied after filters
      if (filters.search) {
        q = q.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.authorId) q = q.eq('author_id', filters.authorId);
      if (filters.isFeatured !== undefined) q = q.eq('is_featured', filters.isFeatured);
      if (filters.isPinned !== undefined) q = q.eq('is_pinned', filters.isPinned);
      if (filters.startDate) q = q.gte('created_at', filters.startDate);
      if (filters.endDate) q = q.lte('created_at', filters.endDate);
      // Folder filter
      if (filters.folderId) q = q.eq('folder_id', filters.folderId);
      return q;
    };

    // For admins, a single query suffices. For non-admins, return published/public resources
    // plus any resources authored by the current user (so submitters see their pending items).
    let data: any[] = [];
    let count = 0;

    if (isAdmin) {
      let q = baseQuery();
      q = applyCommonFilters(q).order('is_pinned', { ascending: false }).order(filters.sortBy, {
        ascending: filters.sortOrder === 'asc',
      });

      const from = (filters.page - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;

      const { data: listData, error: listError, count: listCount } = await q.range(from, to);

      if (listError) {
        console.error('Error fetching resources:', listError);
        return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
      }

      data = listData || [];
      count = listCount || 0;
    } else {
      // For non-admin users:
      // 1) include published resources they can access (public OR targeted)
      // 2) include their own authored resources (including pending) for submission visibility

      // Resolve user department for targeting checks
      const { data: userData } = await supabase
        .from('users')
        .select('department_id')
        .eq('id', user.id)
        .single();

      const userDepartmentId = userData?.department_id as string | null;

      let publicQ = baseQuery();
      publicQ = applyCommonFilters(publicQ).eq('status', 'published');
      publicQ = publicQ.order('is_pinned', { ascending: false }).order(filters.sortBy, {
        ascending: filters.sortOrder === 'asc',
      });

      const from = (filters.page - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;

      const [{ data: publicData, error: publicErr }, { data: authorData, error: authorErr }] =
        await Promise.all([
          // Fetch the public set (paginated)
          publicQ.range(from, to),
          // Fetch the current user's resources (all matching folder/search filters) so they can see their own pending items
          applyCommonFilters(supabase.from('resources').select('*').is('deleted_at', null).eq('author_id', user.id)),
        ]);

      if (publicErr) {
        console.error('Error fetching public resources:', publicErr);
        return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
      }
      if (authorErr) {
        console.error('Error fetching author resources:', authorErr);
        return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
      }

      const authorList = authorData || [];
      const publicList = publicData || [];

      const canAccessPublishedResource = (resource: {
        is_public?: boolean;
        target_roles?: string[];
        target_departments?: string[];
        target_employees?: string[];
      }): boolean => {
        if (resource.is_public) return true;

        const targetRoles = resource.target_roles || [];
        const targetDepartments = resource.target_departments || [];
        const targetEmployees = resource.target_employees || [];

        if (targetRoles.length > 0 && role && targetRoles.includes(role)) {
          return true;
        }

        if (targetDepartments.length > 0 && userDepartmentId && targetDepartments.includes(userDepartmentId)) {
          return true;
        }

        if (targetEmployees.length > 0 && targetEmployees.includes(user.id)) {
          return true;
        }

        // No explicit targeting means visible to all authenticated users.
        if (targetRoles.length === 0 && targetDepartments.length === 0 && targetEmployees.length === 0) {
          return true;
        }

        return false;
      };

      const visiblePublishedList = publicList.filter(canAccessPublishedResource);

      // Merge with author resources first, then public resources (dedupe by id).
      const authorIds = new Set(authorList.map((r: any) => r.id));
      const combined = [...authorList, ...visiblePublishedList.filter((r: any) => !authorIds.has(r.id))];

      data = combined;
      // For total we approximate by merged visible records in the response window.
      count = combined.length || 0;
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
    const { user, role, error } = await getAuthedSupabase();

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
    const requestedCategory =
      typeof (body as { category?: unknown })?.category === 'string'
        ? ((body as { category?: string }).category ?? '').trim()
        : '';
    const category = requestedCategory || DEFAULT_RESOURCE_CATEGORY;

    const requestedResourceType =
      typeof (body as { resourceType?: unknown })?.resourceType === 'string'
        ? ((body as { resourceType?: string }).resourceType ?? '').trim()
        : '';
    const resourceType = requestedResourceType || mapMimeTypeToResourceType(payload.mimeType);

    const isAdmin = isResourceAdmin(role);

    const insertPayload: Record<string, any> = {
      title: payload.title,
      description: payload.description || null,
      excerpt: normalizeExcerpt(payload.description, payload.excerpt),
      // Keep legacy non-null columns explicit while migration to dynamic categories continues.
      resource_type: resourceType,
      category,
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

    // Use admin client to bypass RLS for creating the initial resource row
    // (non-admin submissions are created as drafts and go through approval workflows).
    const adminClient = createSupabaseAdminClient();
    const { data, error: createError } = await adminClient
      .from('resources')
      .insert(insertPayload, { defaultToNull: false })
      .select('*')
      .single();

    if (createError || !data) {
      console.error('Error creating resource:', createError);
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
    }

    logActivity(adminClient, {
      userId: user.id,
      action: 'create_resource',
      tableName: 'resources',
      recordId: data.id,
      metadata: { title: data.title, resourceType: data.resource_type },
    });

    // If a non-admin submitted the resource, notify admins for review
    if (!isAdmin) {
      try {
        const { data: admins } = await adminClient
          .from('users')
          .select('id')
          .in('role', NOTIFICATION_ADMIN_ROLES)
          .is('deleted_at', null);

        if (admins && admins.length > 0) {
          await createNotificationsForUsers(
            admins.map((a: { id: string }) => a.id),
            {
              type: 'resource_submitted',
              title: 'Resource submitted',
              message: `${user.email || user.id} submitted "${data.title}" for review`,
              link: '/admin/resources/pending',
              metadata: { resourceId: data.id, authorId: user.id },
              dedupeKey: `resource:pending_submission:${data.id}`,
              dedupeWindowHours: 6,
            }
          );
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
