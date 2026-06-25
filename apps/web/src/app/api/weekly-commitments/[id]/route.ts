import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/audit';

const patchSchema = z
  .object({
    lock: z.boolean().optional(),
    items: z
      .array(
        z.object({
          milestone_id: z.string().uuid(),
          slot_order: z.number().int().min(1).max(5),
        })
      )
      .min(3)
      .max(5)
      .optional(),
  })
  .refine((v) => v.lock === true || Array.isArray(v.items), {
    message: 'Must provide either { lock: true } or an items array',
  });

export async function PATCH(request: NextRequest, context: any) {
  const { id } = (context?.params ?? {}) as { id: string };
  try {
    const body = await request.json();

    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: commitment, error: cErr } = await supabaseAdmin
      .from('weekly_commitments')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    if (!commitment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isOwner = commitment.user_id === user.id;
    const { data: roleRow } = await supabaseAdmin.from('users').select('role').eq('id', user.id).maybeSingle();
    const role = roleRow?.role ?? null;
    const isAdmin = role === 'admin' || role === 'super_admin';

    if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { lock, items } = parsed.data;

    // Lock action
    if (lock) {
      if (commitment.locked_at) return NextResponse.json({ error: 'Already locked' }, { status: 409 });

      const now = new Date().toISOString();
      const { data: updated, error: upErr } = await supabaseAdmin
        .from('weekly_commitments')
        .update({ locked_at: now })
        .eq('id', id)
        .select('*')
        .single();
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

      logActivity(supabase, {
        userId: user.id,
        action: 'weekly_commitment_locked',
        tableName: 'weekly_commitments',
        recordId: id,
      });

      // Return enriched items like GET
      const { data: itemsList } = await supabaseAdmin
        .from('weekly_commitment_items')
        .select('id, milestone_id, slot_order')
        .eq('commitment_id', id)
        .order('slot_order', { ascending: true });

      const milestoneIds = (itemsList ?? []).map((it: any) => it.milestone_id);
      const { data: milestones } = await supabaseAdmin
        .from('project_milestones')
        .select('id, title, project_id, status, progress_pct')
        .in('id', milestoneIds || []);

      const mMap = new Map<string, any>();
      for (const m of milestones ?? []) mMap.set(m.id, m);

      const enriched = (itemsList ?? []).map((it: any) => ({ id: it.id, slot_order: it.slot_order, milestone: mMap.get(it.milestone_id) ?? { id: it.milestone_id } }));

      return NextResponse.json({ data: { ...updated, items: enriched } });
    }

    // Edit items (only when not locked)
    if (items) {
      if (commitment.locked_at) return NextResponse.json({ error: 'Commitment is locked' }, { status: 409 });

      // Basic uniqueness checks
      const slotSet = new Set<number>();
      const milestoneSet = new Set<string>();
      for (const it of items) {
        if (slotSet.has(it.slot_order)) return NextResponse.json({ error: 'Duplicate slot_order' }, { status: 400 });
        slotSet.add(it.slot_order);
        if (milestoneSet.has(it.milestone_id)) return NextResponse.json({ error: 'Duplicate milestone_id' }, { status: 400 });
        milestoneSet.add(it.milestone_id);
      }

      const { error: delErr } = await supabaseAdmin.from('weekly_commitment_items').delete().eq('commitment_id', id);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

      const inserts = items.map((it: any) => ({ commitment_id: id, milestone_id: it.milestone_id, slot_order: it.slot_order }));
      const { data: createdItems, error: insertErr } = await supabaseAdmin.from('weekly_commitment_items').insert(inserts).select('*');
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

      const milestoneIds2 = createdItems.map((ci: any) => ci.milestone_id);
      const { data: milestones2 } = await supabaseAdmin
        .from('project_milestones')
        .select('id, title, project_id, status, progress_pct')
        .in('id', milestoneIds2 || []);

      const mMap2 = new Map<string, any>();
      for (const m of milestones2 ?? []) mMap2.set(m.id, m);

      const enriched2 = createdItems.map((ci: any) => ({ id: ci.id, slot_order: ci.slot_order, milestone: mMap2.get(ci.milestone_id) ?? { id: ci.milestone_id } }));

      logActivity(supabase, {
        userId: user.id,
        action: 'weekly_commitment_items_updated',
        tableName: 'weekly_commitments',
        recordId: id,
        metadata: { itemsCount: enriched2.length, updatedByAdmin: isAdmin },
      });

      const { data: commitAfter } = await supabaseAdmin
        .from('weekly_commitments')
        .select('id, user_id, iso_week, iso_year, locked_at, created_at, updated_at')
        .eq('id', id)
        .maybeSingle();

      return NextResponse.json({ data: { ...commitAfter, items: enriched2 } });
    }

    return NextResponse.json({ error: 'No actionable fields provided' }, { status: 400 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('PATCH /api/weekly-commitments/:id error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: any) {
  const { id } = (context?.params ?? {}) as { id: string };
  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: commitment, error: cErr } = await supabaseAdmin
      .from('weekly_commitments')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    if (!commitment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isOwner = commitment.user_id === user.id;
    const { data: roleRow } = await supabaseAdmin.from('users').select('role').eq('id', user.id).maybeSingle();
    const role = roleRow?.role ?? null;
    const isAdmin = role === 'admin' || role === 'super_admin';

    if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (commitment.locked_at && !isAdmin) return NextResponse.json({ error: 'Locked commitments can only be deleted by admins' }, { status: 403 });

    const now = new Date().toISOString();
    const { error: updErr } = await supabaseAdmin.from('weekly_commitments').update({ deleted_at: now }).eq('id', id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    logActivity(supabase, {
      userId: user.id,
      action: 'weekly_commitment_deleted',
      tableName: 'weekly_commitments',
      recordId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('DELETE /api/weekly-commitments/:id error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
