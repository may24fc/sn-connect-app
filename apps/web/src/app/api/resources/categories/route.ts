import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin } from '../_lib';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9_-]+$/, 'Slug must be lowercase alphanumeric with hyphens/underscores'),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

/**
 * GET /api/resources/categories
 * List all resource categories (tree structure).
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';
    const adminClient = createSupabaseAdminClient();

    let query = adminClient
      .from('resource_categories')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching resource categories:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    // Count resources per category
    const categoryIds = (data || []).map((c) => c.id);
    let resourceCounts = new Map<string, number>();

    if (categoryIds.length > 0) {
      const { data: counts, error: countError } = await adminClient
        .from('resources')
        .select('category_id')
        .in('category_id', categoryIds)
        .is('deleted_at', null);

      if (!countError && counts) {
        for (const row of counts) {
          const cid = row.category_id as string;
          resourceCounts.set(cid, (resourceCounts.get(cid) || 0) + 1);
        }
      }
    }

    // Build tree structure
    const categories = (data || []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      parentId: cat.parent_id,
      displayOrder: cat.display_order,
      isActive: cat.is_active,
      createdAt: cat.created_at,
      updatedAt: cat.updated_at,
      resourceCount: resourceCounts.get(cat.id) || 0,
    }));

    return NextResponse.json({
      data: categories,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('Unexpected error in GET /api/resources/categories:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/resources/categories
 * Create a new resource category (admin only).
 */
export async function POST(request: NextRequest) {
  try {
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    const { data, error: insertError } = await adminClient
      .from('resource_categories')
      .insert({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        icon: parsed.data.icon || null,
        parent_id: parsed.data.parentId || null,
        display_order: parsed.data.displayOrder ?? 0,
        is_active: parsed.data.isActive ?? true,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'A category with this name or slug already exists' },
          { status: 409 }
        );
      }
      console.error('Error creating resource category:', insertError);
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in POST /api/resources/categories:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/resources/categories
 * Update a resource category (admin only).
 * Expects query param: ?id=<uuid>
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const categoryId = request.nextUrl.searchParams.get('id');
    if (!categoryId) {
      return NextResponse.json({ error: 'Missing category id' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
    if (parsed.data.slug !== undefined) updatePayload.slug = parsed.data.slug;
    if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description;
    if (parsed.data.icon !== undefined) updatePayload.icon = parsed.data.icon;
    if (parsed.data.parentId !== undefined) updatePayload.parent_id = parsed.data.parentId;
    if (parsed.data.displayOrder !== undefined) updatePayload.display_order = parsed.data.displayOrder;
    if (parsed.data.isActive !== undefined) updatePayload.is_active = parsed.data.isActive;

    const { data, error: updateError } = await adminClient
      .from('resource_categories')
      .update(updatePayload)
      .eq('id', categoryId)
      .select('*')
      .single();

    if (updateError) {
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'A category with this name or slug already exists' },
          { status: 409 }
        );
      }
      console.error('Error updating resource category:', updateError);
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/resources/categories:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/resources/categories
 * Delete a resource category (admin only).
 * Expects query param: ?id=<uuid>
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const categoryId = request.nextUrl.searchParams.get('id');
    if (!categoryId) {
      return NextResponse.json({ error: 'Missing category id' }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();

    // Check for child categories
    const { count: childCount } = await adminClient
      .from('resource_categories')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', categoryId);

    if (childCount && childCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a category that has subcategories. Remove subcategories first.' },
        { status: 409 }
      );
    }

    // Check for resources using this category
    const { count: resourceCount } = await adminClient
      .from('resources')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId)
      .is('deleted_at', null);

    if (resourceCount && resourceCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete a category with ${resourceCount} resource(s). Reassign resources first.` },
        { status: 409 }
      );
    }

    const { error: deleteError } = await adminClient
      .from('resource_categories')
      .delete()
      .eq('id', categoryId);

    if (deleteError) {
      console.error('Error deleting resource category:', deleteError);
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/resources/categories:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
