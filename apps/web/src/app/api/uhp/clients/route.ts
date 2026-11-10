import { logActivity } from '@/lib/audit';
import { uhpClientCreateSchema } from '@/lib/schemas/uhp.schema';
import {
  UHP_CLIENT_STATUS_VALUES,
  UHP_CLIENT_TYPE_VALUES,
  type UhpClientContact,
  findUhpDuplicateClients,
  mergeUhpSourceOptions,
} from '@/lib/uhp';
import { type NextRequest, NextResponse } from 'next/server';
import { type UhpAuthedContext, requireUhpModule } from '../_lib';

const OUTREACH_RESULT_VALUES = ['replied', 'declined', 'we-form'] as const;
type OutreachResult = (typeof OUTREACH_RESULT_VALUES)[number];

function isOutreachResult(value: string | null): value is OutreachResult {
  return OUTREACH_RESULT_VALUES.includes(value as OutreachResult);
}

function readOutreachDateRange(params: URLSearchParams) {
  const from = params.get('from');
  const to = params.get('to');
  if (!(from || to)) return { ok: true as const, range: null };
  if (!(from && to) || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to))) {
    return { ok: false as const };
  }
  if (Date.parse(from) > Date.parse(to)) return { ok: false as const };
  return { ok: true as const, range: { from, to } };
}

async function findExistingDuplicates(
  admin: UhpAuthedContext['admin'],
  input: { name: string; email?: string | null | undefined; phone?: string | null | undefined }
): Promise<Array<UhpClientContact> | null> {
  // Phone formats vary in migrated data, so matching happens in app code rather than SQL filters.
  const { data, error } = await admin
    .from('uhp_clients')
    .select('id, name, email, phone')
    .is('deleted_at', null)
    .limit(10000);
  if (error) {
    console.error('Failed to check UHP client duplicates:', error);
    return null;
  }
  return findUhpDuplicateClients(
    { name: input.name, email: input.email ?? null, phone: input.phone ?? null },
    (data ?? []) as Array<UhpClientContact>
  );
}

async function logInitialOutreach(
  context: UhpAuthedContext,
  clientId: string,
  channel: string | null
): Promise<void> {
  const { error } = await context.admin.from('uhp_client_activities').insert({
    client_id: clientId,
    activity_type: 'Interaction',
    direction: 'outbound',
    channel,
    title: 'Initial outreach',
    status: 'Complete',
    created_by: context.userId,
    updated_by: context.userId,
  });
  if (error) console.error('Failed to log UHP initial outreach:', error);
}

export async function GET(request: NextRequest) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const params = request.nextUrl.searchParams;
  const search = params.get('search')?.trim();
  const status = params.get('status');
  const type = params.get('type');
  const owner = params.get('owner')?.trim();
  const outreachResult = params.get('outreachResult');
  const dateRange = readOutreachDateRange(params);
  if (!dateRange.ok) {
    return NextResponse.json({ error: 'Invalid outreach date range' }, { status: 400 });
  }
  const range = dateRange.range;
  let query = auth.context.admin
    .from('uhp_clients')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(500);
  if (search) {
    const safe = search.replaceAll(',', ' ');
    query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  if (UHP_CLIENT_STATUS_VALUES.includes(status as (typeof UHP_CLIENT_STATUS_VALUES)[number])) {
    query = query.eq('status', status);
  }
  if (UHP_CLIENT_TYPE_VALUES.includes(type as (typeof UHP_CLIENT_TYPE_VALUES)[number])) {
    query = query.eq('client_type', type);
  }
  if (owner) query = query.ilike('lead_owner', owner);
  if (outreachResult === 'replied') {
    query = query.eq('replied', true);
    if (range) query = query.gte('replied_at', range.from).lte('replied_at', range.to);
  }
  if (outreachResult === 'declined') {
    query = query.eq('interest_state', 'declined');
    if (range) {
      query = query.gte('interest_state_at', range.from).lte('interest_state_at', range.to);
    }
  }
  if (outreachResult === 'we-form') {
    query = query.eq('we_form', true);
    if (range) query = query.gte('we_form_at', range.from).lte('we_form_at', range.to);
  }
  if (range && !isOutreachResult(outreachResult)) {
    query = query.or(
      `and(replied.eq.true,replied_at.gte.${range.from},replied_at.lte.${range.to}),` +
        `and(interest_state.eq.declined,interest_state_at.gte.${range.from},interest_state_at.lte.${range.to}),` +
        `and(we_form.eq.true,we_form_at.gte.${range.from},we_form_at.lte.${range.to})`
    );
  }

  let repliedCountQuery = auth.context.admin
    .from('uhp_clients')
    .select('id', { count: 'exact', head: true })
    .eq('replied', true)
    .is('deleted_at', null);
  let declinedCountQuery = auth.context.admin
    .from('uhp_clients')
    .select('id', { count: 'exact', head: true })
    .eq('interest_state', 'declined')
    .is('deleted_at', null);
  let weFormCountQuery = auth.context.admin
    .from('uhp_clients')
    .select('id', { count: 'exact', head: true })
    .eq('we_form', true)
    .is('deleted_at', null);
  if (range) {
    repliedCountQuery = repliedCountQuery.gte('replied_at', range.from).lte('replied_at', range.to);
    declinedCountQuery = declinedCountQuery
      .gte('interest_state_at', range.from)
      .lte('interest_state_at', range.to);
    weFormCountQuery = weFormCountQuery.gte('we_form_at', range.from).lte('we_form_at', range.to);
  }
  // Sources come from every client, not just this page or search, so a source added on
  // one client is offered in the dropdown for all of them.
  const [{ data, error }, sourcesResult, repliedCount, declinedCount, weFormCount] =
    await Promise.all([
      query,
      auth.context.admin
        .from('uhp_clients')
        .select('source_name')
        .is('deleted_at', null)
        .not('source_name', 'is', null)
        .limit(10000),
      repliedCountQuery,
      declinedCountQuery,
      weFormCountQuery,
    ]);
  if (error) {
    console.error('Failed to fetch UHP clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
  if (repliedCount.error || declinedCount.error || weFormCount.error) {
    console.error('Failed to count UHP outreach results', {
      replied: repliedCount.error,
      declined: declinedCount.error,
      weForm: weFormCount.error,
    });
    return NextResponse.json({ error: 'Failed to count outreach results' }, { status: 500 });
  }
  return NextResponse.json({
    data: data ?? [],
    filterCounts: {
      replied: repliedCount.count ?? 0,
      declined: declinedCount.count ?? 0,
      weForm: weFormCount.count ?? 0,
    },
    sources: mergeUhpSourceOptions(
      (sourcesResult.data ?? []).map((row: { source_name: string | null }) => row.source_name)
    ),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = uhpClientCreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid client', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsed.data;
  const createdAt = new Date().toISOString();

  if (!input.allowDuplicate) {
    const duplicates = await findExistingDuplicates(auth.context.admin, input);
    if (!duplicates) {
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }
    if (duplicates.length) {
      return NextResponse.json(
        { error: 'A client with the same details is already on file', duplicates },
        { status: 409 }
      );
    }
  }

  const { data, error } = await auth.context.admin
    .from('uhp_clients')
    .insert({
      name: input.name,
      status: input.status,
      client_type: input.clientType ?? null,
      interest_state: input.interestState,
      interest_state_at: input.interestState === 'unknown' ? null : createdAt,
      replied: input.replied,
      replied_at: input.replied ? createdAt : null,
      called: input.called,
      called_at: input.called ? createdAt : null,
      we_form: input.weForm,
      we_form_at: input.weForm ? createdAt : null,
      we_call: input.weCall,
      lead_owner: input.leadOwner ?? null,
      source_name: input.sourceName ?? null,
      source_url: input.sourceUrl ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      alternate_phone: input.alternatePhone ?? null,
      instagram_url: input.instagramUrl ?? null,
      website: input.website ?? null,
      job_title: input.jobTitle ?? null,
      office_address: input.officeAddress ?? null,
      chatgpt_url: input.chatgptUrl ?? null,
      due_date: input.dueDate ?? null,
      created_by: auth.context.userId,
      updated_by: auth.context.userId,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  if (input.logInitialOutreach) {
    await logInitialOutreach(auth.context, data.id, input.outreachChannel ?? null);
  }
  void logActivity(auth.context.admin, {
    userId: auth.context.userId,
    action: 'create_uhp_client',
    tableName: 'uhp_clients',
    recordId: data.id,
  });
  return NextResponse.json({ data }, { status: 201 });
}
