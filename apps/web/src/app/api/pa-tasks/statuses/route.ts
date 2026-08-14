import { logActivity } from '@/lib/audit';
import { paTaskLookupCreateSchema, paTaskLookupUpdateSchema } from '@/lib/schemas/pa-task.schema';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPaTaskAuthedContext, getPaTaskWriteErrorMessage } from '../_lib';

const statusUpdateSchema = paTaskLookupUpdateSchema.extend({
  id: z.string().uuid('A valid status id is required'),
});

const statusDeleteSchema = z.object({
  id: z.string().uuid('A valid status id is required'),
});

export async function GET() {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!auth.context.canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await auth.context.supabaseAdmin
      .from('pa_task_statuses')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch PA task statuses:', error);
      return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('Unexpected error in GET /api/pa-tasks/statuses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, canManage } = auth.context;
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = paTaskLookupCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('pa_task_statuses')
      .insert({
        label: parsed.data.label,
        color: parsed.data.color,
        sort_order: parsed.data.sortOrder,
        is_default: parsed.data.isDefault,
        is_terminal: parsed.data.isTerminal ?? false,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Failed to create PA task status:', error);
      return NextResponse.json({ error: getPaTaskWriteErrorMessage(error) }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'create_pa_task_status',
      tableName: 'pa_task_statuses',
      recordId: data.id,
      metadata: { label: data.label },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/pa-tasks/statuses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, canManage } = auth.context;
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = statusUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Record<string, string | number | boolean> = {};
    if (parsed.data.label !== undefined) updates.label = parsed.data.label;
    if (parsed.data.color !== undefined) updates.color = parsed.data.color;
    if (parsed.data.sortOrder !== undefined) updates.sort_order = parsed.data.sortOrder;
    if (parsed.data.isDefault !== undefined) updates.is_default = parsed.data.isDefault;
    if (parsed.data.isTerminal !== undefined) updates.is_terminal = parsed.data.isTerminal;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('pa_task_statuses')
      .update(updates)
      .eq('id', parsed.data.id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Failed to update PA task status:', error);
      return NextResponse.json({ error: getPaTaskWriteErrorMessage(error) }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'update_pa_task_status',
      tableName: 'pa_task_statuses',
      recordId: data.id,
      metadata: { label: data.label },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/pa-tasks/statuses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, canManage } = auth.context;
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = statusDeleteSchema.safeParse(await request.json().catch(() => ({})));
    const id = parsed.success ? parsed.data.id : request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('pa_task_statuses')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .single();

    if (error || !data) {
      console.error('Failed to delete PA task status:', error);
      return NextResponse.json({ error: getPaTaskWriteErrorMessage(error) }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'delete_pa_task_status',
      tableName: 'pa_task_statuses',
      recordId: id,
    });

    return NextResponse.json({ data: { id } });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/pa-tasks/statuses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
