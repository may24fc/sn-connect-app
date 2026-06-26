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
    const queryProjectId = url.searchParams.get('projectId');

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

    let commitmentsQuery = supabaseAdmin
      .from('weekly_commitments')
      .select('id, user_id, project_id, iso_week, iso_year, locked_at, created_at, updated_at')
      .eq('user_id', targetUserId)
      .eq('iso_week', iso_week)
      .eq('iso_year', iso_year)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (queryProjectId) {
      commitmentsQuery = commitmentsQuery.eq('project_id', queryProjectId);
    }

    const { data: commitments } = await commitmentsQuery;

    if (!commitments || commitments.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const commitmentIds = commitments.map((commitment: { id: string }) => commitment.id);

    const projectIds = Array.from(
      new Set(
        commitments
          .map((commitment: { project_id?: string | null }) => commitment.project_id)
          .filter((projectId): projectId is string => !!projectId)
      )
    );

    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id, name')
      .in('id', projectIds.length ? projectIds : ['00000000-0000-0000-0000-000000000000']);

    const projectNameById = new Map<string, string>();
    for (const project of projects ?? []) {
      projectNameById.set(project.id, project.name ?? 'Unknown project');
    }

    const { data: items } = await supabaseAdmin
      .from('weekly_commitment_items')
      .select('id, commitment_id, milestone_id, slot_order')
      .in('commitment_id', commitmentIds)
      .order('slot_order', { ascending: true });

    // Enrich milestones with basic metadata
    const milestoneIds = (items ?? []).map((i: any) => i.milestone_id);
    const { data: milestones } = await supabaseAdmin
      .from('project_milestones')
      .select('id, title, project_id, status, progress_pct')
      .in('id', milestoneIds || []);

    const milestoneMap = new Map<string, any>();
    for (const m of milestones ?? []) milestoneMap.set(m.id, m);

    const itemsByCommitment = new Map<string, Array<{ id: string; slot_order: number; milestone: any }>>();
    for (const item of (items ?? []) as any[]) {
      const commitmentId = (item as Record<string, unknown>)['commitment_id'] as string;
      const milestoneId = item.milestone_id as string;
      const milestone = milestoneMap.get(milestoneId) ?? { id: milestoneId };
      const milestoneProjectId = milestone?.project_id as string | undefined;
      const milestoneProjectName = milestoneProjectId ? projectNameById.get(milestoneProjectId) : null;
      const enrichedItem = {
        id: item.id,
        slot_order: item.slot_order,
        milestone: {
          ...milestone,
          project_name: milestoneProjectName ?? milestone?.project_name ?? null,
        },
      };

      const current = itemsByCommitment.get(commitmentId) ?? [];
      current.push(enrichedItem);
      itemsByCommitment.set(commitmentId, current);
    }

    const enrichedCommitments = commitments.map((commitment: any) => ({
      ...commitment,
      project_name: commitment.project_id
        ? (projectNameById.get(commitment.project_id) ?? 'Unknown project')
        : null,
      items: itemsByCommitment.get(commitment.id) ?? [],
    }));

    return NextResponse.json({ data: enrichedCommitments });
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

    const milestoneIds = items.map((item) => item.milestone_id);
    const { data: selectedMilestones, error: selectedMilestonesErr } = await supabaseAdmin
      .from('project_milestones')
      .select('id, project_id, title, status, progress_pct')
      .in('id', milestoneIds);

    if (selectedMilestonesErr) {
      return NextResponse.json({ error: selectedMilestonesErr.message }, { status: 500 });
    }

    if (!selectedMilestones || selectedMilestones.length !== milestoneIds.length) {
      return NextResponse.json({ error: 'One or more selected milestones no longer exist.' }, { status: 400 });
    }

    const projectIds = Array.from(
      new Set(
        selectedMilestones
          .map((milestone) => milestone.project_id)
          .filter((projectId): projectId is string => !!projectId)
      )
    );

    if (projectIds.length !== 1) {
      return NextResponse.json(
        { error: 'Weekly commitment items must belong to the same project.' },
        { status: 400 }
      );
    }

    const projectId = projectIds[0];

    // ensure no existing commitment for the same user/week/project
    const { data: existing } = await supabaseAdmin
      .from('weekly_commitments')
      .select('id')
      .eq('user_id', user.id)
      .eq('iso_week', iso_week)
      .eq('iso_year', iso_year)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: 'Commitment already exists for this project in the selected week.' },
        { status: 409 }
      );
    }

    // Transactional insert: create commitment, then items
    const { data: created, error: createErr } = await supabaseAdmin
      .from('weekly_commitments')
      .insert({ user_id: user.id, project_id: projectId, iso_week, iso_year, created_by: user.id })
      .select('*')
      .single();
    if (createErr || !created) return NextResponse.json({ error: createErr?.message ?? 'Failed to create' }, { status: 500 });

    const inserts = items.map((it: any) => ({ commitment_id: created.id, milestone_id: it.milestone_id, slot_order: it.slot_order }));
    const { data: createdItems, error: itemsErr } = await supabaseAdmin.from('weekly_commitment_items').insert(inserts).select('*');
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

    // enrich items
    const createdMilestoneIds = createdItems.map((ci: any) => ci.milestone_id);
    const { data: milestones } = await supabaseAdmin
      .from('project_milestones')
      .select('id, title, project_id, status, progress_pct')
      .in('id', createdMilestoneIds || []);
    const milestoneMap = new Map<string, any>();
    for (const m of milestones ?? []) milestoneMap.set(m.id, m);

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .maybeSingle();

    const enriched = createdItems.map((ci: any) => ({
      id: ci.id,
      slot_order: ci.slot_order,
      milestone: {
        ...(milestoneMap.get(ci.milestone_id) ?? { id: ci.milestone_id }),
        project_name: project?.name ?? null,
      },
    }));

    return NextResponse.json(
      { data: { ...created, project_name: project?.name ?? null, items: enriched } },
      { status: 201 }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('POST /api/weekly-commitments error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
