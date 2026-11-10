import {
  RECOGNITION_CATEGORIES,
  ensureRecognitionPeriod,
  getRecognitionEvidence,
  requireRecognitionUser,
} from '@/lib/recognition';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const updateSchema = z.object({
  periodId: z.string().uuid(),
  action: z.enum(['save', 'approve', 'reject']),
  publicIntro: z.string().trim().max(1000).nullable().optional(),
  selections: z
    .array(
      z.object({
        recipientUserId: z.string().uuid(),
        category: z
          .enum(['impact_delivery', 'accountability_timeliness', 'collaboration_initiative'])
          .nullable(),
        publicReason: z.string().trim().min(10).max(1000),
        evidenceRefs: z.array(z.string()).default([]),
      })
    )
    .default([]),
});

async function snapshot(periodId?: string) {
  const admin = await requireRecognitionUser(true);
  if (!admin.ok) return admin;
  let period: Awaited<ReturnType<typeof ensureRecognitionPeriod>>;
  if (periodId) {
    const { data, error } = await admin.admin
      .from('recognition_periods')
      .select('*')
      .eq('id', periodId)
      .maybeSingle();
    if (error)
      return { ok: false as const, status: 500, error: 'Failed to load recognition period' };
    if (!data) return { ok: false as const, status: 404, error: 'Recognition period not found' };
    period = data;
  } else {
    period = await ensureRecognitionPeriod();
  }
  const [{ data: selections }, evidence, { data: periods }, { data: employees }] =
    await Promise.all([
      admin.admin
        .from('recognition_selections')
        .select('*')
        .eq('period_id', period.id)
        .order('display_order'),
      getRecognitionEvidence(period),
      admin.admin
        .from('recognition_periods')
        .select('*,recognition_selections(*)')
        .order('period_end', { ascending: false })
        .limit(12),
      admin.admin
        .from('employees')
        .select('user_id,first_name,last_name,position')
        .is('deleted_at', null),
    ]);
  const people = new Map(
    (employees ?? []).map((employee) => [
      employee.user_id,
      { name: `${employee.first_name} ${employee.last_name}`.trim(), position: employee.position },
    ])
  );
  const recentIds = new Set(
    (periods ?? [])
      .filter((item) => item.status === 'published')
      .flatMap((item) =>
        (item.recognition_selections ?? []).map(
          (selection: { recipient_user_id: string }) => selection.recipient_user_id
        )
      )
  );
  return {
    ok: true as const,
    auth: admin,
    data: {
      period,
      selections: selections ?? [],
      categories: RECOGNITION_CATEGORIES,
      evidence: evidence.map((item) => ({
        ...item,
        person: people.get(String(item.userId)) ?? null,
        recentlyRecognized: recentIds.has(String(item.userId)),
      })),
      people: Array.from(people, ([userId, value]) => ({ userId, ...value })),
      periods: periods ?? [],
    },
  };
}

export async function GET(request: Request) {
  const requestedPeriodId = new URL(request.url).searchParams.get('periodId');
  if (requestedPeriodId && !z.string().uuid().safeParse(requestedPeriodId).success)
    return NextResponse.json({ error: 'Invalid recognition period' }, { status: 400 });
  const result = await snapshot(requestedPeriodId ?? undefined);
  if (!result.ok || !('data' in result))
    return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function PATCH(request: Request) {
  const auth = await requireRecognitionUser(true);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid recognition update', details: parsed.error.flatten() },
      { status: 400 }
    );
  const { data: period } = await auth.admin
    .from('recognition_periods')
    .select('*')
    .eq('id', parsed.data.periodId)
    .maybeSingle();
  if (!period || period.status === 'published')
    return NextResponse.json({ error: 'Published periods cannot be edited' }, { status: 409 });
  if (period.period_type === 'monthly' && parsed.data.action === 'approve') {
    const categories = new Set(parsed.data.selections.map((selection) => selection.category));
    if (
      parsed.data.selections.length !== 3 ||
      (Object.keys(RECOGNITION_CATEGORIES) as Array<keyof typeof RECOGNITION_CATEGORIES>).some(
        (category) => !categories.has(category)
      )
    )
      return NextResponse.json(
        { error: 'Monthly awards require exactly one recipient per category' },
        { status: 400 }
      );
  }
  if (
    period.period_type === 'weekly' &&
    parsed.data.selections.some((selection) => selection.category !== null)
  )
    return NextResponse.json(
      { error: 'Weekly wins are not ranked or categorized' },
      { status: 400 }
    );
  if (parsed.data.action === 'approve' && !parsed.data.selections.length)
    return NextResponse.json(
      { error: 'Select at least one recipient before approval' },
      { status: 400 }
    );
  if (parsed.data.action === 'approve') {
    const nominationIds = parsed.data.selections
      .flatMap((selection) => selection.evidenceRefs)
      .filter((ref) => ref.startsWith('nomination:'))
      .map((ref) => ref.slice('nomination:'.length));
    if (nominationIds.length) {
      const { count } = await auth.admin
        .from('recognition_nominations')
        .select('id', { count: 'exact', head: true })
        .in('id', nominationIds)
        .neq('status', 'approved');
      if (count)
        return NextResponse.json(
          { error: 'Review and approve selected nominations before approving the period' },
          { status: 400 }
        );
    }
  }
  const { error: deleteError } = await auth.admin
    .from('recognition_selections')
    .delete()
    .eq('period_id', period.id);
  if (deleteError)
    return NextResponse.json({ error: 'Failed to update selections' }, { status: 500 });
  if (parsed.data.selections.length) {
    const { error } = await auth.admin.from('recognition_selections').insert(
      parsed.data.selections.map((selection, index) => ({
        period_id: period.id,
        recipient_user_id: selection.recipientUserId,
        category: selection.category,
        public_reason: selection.publicReason,
        evidence_refs: selection.evidenceRefs,
        display_order: index,
      }))
    );
    if (error) return NextResponse.json({ error: 'Failed to save selections' }, { status: 500 });
  }
  const status =
    parsed.data.action === 'approve'
      ? 'approved'
      : parsed.data.action === 'reject'
        ? 'rejected'
        : 'draft';
  const { error } = await auth.admin
    .from('recognition_periods')
    .update({
      status,
      public_intro: parsed.data.publicIntro ?? period.public_intro,
      reviewed_by: parsed.data.action === 'save' ? null : auth.user.id,
      reviewed_at: parsed.data.action === 'save' ? null : new Date().toISOString(),
      last_error: null,
    })
    .eq('id', period.id);
  if (error)
    return NextResponse.json({ error: 'Failed to update recognition period' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
