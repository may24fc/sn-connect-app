import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '@/lib/supabase/server';

const createSchema = z.object({
  iso_week: z.number().int(),
  iso_year: z.number().int(),
  items: z
    .array(
      z.object({
        milestone_id: z.string().uuid(),
        slot_order: z.number().int().min(1).max(5),
      })
    )
    .min(3)
    .max(5),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('userId');

    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

    // Determine requester
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let targetUserId = user.id;

    // If admin requested a specific user's commitments, validate role via admin client
    if (queryUserId) {
      const { data: roleRow } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      const role = roleRow?.role ?? null;
      if (role === 'admin' || role === 'super_admin') {
        targetUserId = queryUserId;
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // compute current ISO week/year if not provided
    const week = url.searchParams.get('iso_week');
    const year = url.searchParams.get('iso_year');
    let iso_week = week ? Number(week) : undefined;
    let iso_year = year ? Number(year) : undefined;
    if (!iso_week || !iso_year) {
      const d = new Date();
      const dayNum = (d.getUTCDay() || 7);
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      iso_week = weekNo;
      iso_year = d.getUTCFullYear();
    }

    const { data: commitment } = await supabaseAdmin
      .from('weekly_commitments')
      .select('id, user_id, locked_at, created_at')
      .eq('user_id', targetUserId)
      .eq('iso_week', iso_week)
      .eq('iso_year', iso_year)
      .is('deleted_at', null)
      .maybeSingle();

    if (!commitment) return NextResponse.json({ data: null });

    const { data: items } = await supabaseAdmin
      .from('weekly_commitment_items')
      .select('id, milestone_id, slot_order')
      .eq('commitment_id', commitment.id)
      .order('slot_order', { ascending: true });

    // Enrich milestones with basic metadata
    const milestoneIds = (items ?? []).map((i: any) => i.milestone_id);
    const { data: milestones } = await supabaseAdmin
      .from('project_milestones')
      .select('id, title, project_id, status, progress_pct')
      .in('id', milestoneIds || []);

    const milestoneMap = new Map<string, any>();
    for (const m of milestones ?? []) milestoneMap.set(m.id, m);

    const enriched = (items ?? []).map((it: any) => ({
      id: it.id,
      slot_order: it.slot_order,
      milestone: milestoneMap.get(it.milestone_id) ?? { id: it.milestone_id },
    }));

    return NextResponse.json({ data: { ...commitment, items: enriched } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('GET /api/weekly-commitments error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { iso_week, iso_year, items } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ensure no existing commitment for user/week
    const { data: existing } = await supabaseAdmin
      .from('weekly_commitments')
      .select('id')
      .eq('user_id', user.id)
      .eq('iso_week', iso_week)
      .eq('iso_year', iso_year)
      .is('deleted_at', null)
      .maybeSingle();
    if (existing) return NextResponse.json({ error: 'Commitment already exists for this week' }, { status: 409 });

    // Transactional insert: create commitment, then items
    const { data: created, error: createErr } = await supabaseAdmin
      .from('weekly_commitments')
      .insert({ user_id: user.id, iso_week, iso_year, created_by: user.id })
      .select('*')
      .single();
    if (createErr || !created) return NextResponse.json({ error: createErr?.message ?? 'Failed to create' }, { status: 500 });

    const inserts = items.map((it: any) => ({ commitment_id: created.id, milestone_id: it.milestone_id, slot_order: it.slot_order }));
    const { data: createdItems, error: itemsErr } = await supabaseAdmin.from('weekly_commitment_items').insert(inserts).select('*');
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

    // enrich items
    const milestoneIds = createdItems.map((ci: any) => ci.milestone_id);
    const { data: milestones } = await supabaseAdmin.from('project_milestones').select('id, title, project_id, status, progress_pct').in('id', milestoneIds || []);
    const milestoneMap = new Map<string, any>();
    for (const m of milestones ?? []) milestoneMap.set(m.id, m);

    const enriched = createdItems.map((ci: any) => ({ id: ci.id, slot_order: ci.slot_order, milestone: milestoneMap.get(ci.milestone_id) ?? { id: ci.milestone_id } }));

    return NextResponse.json({ data: { ...created, items: enriched } }, { status: 201 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('POST /api/weekly-commitments error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
