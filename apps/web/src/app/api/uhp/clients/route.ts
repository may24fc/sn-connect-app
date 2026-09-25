import { logActivity } from '@/lib/audit';
import { uhpClientSchema } from '@/lib/schemas/uhp.schema';
import { UHP_CLIENT_STATUS_VALUES, UHP_CLIENT_TYPE_VALUES } from '@/lib/uhp';
import { type NextRequest, NextResponse } from 'next/server';
import { requireUhpModule } from '../_lib';

export async function GET(request: NextRequest) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const params = request.nextUrl.searchParams;
  const search = params.get('search')?.trim();
  const status = params.get('status');
  const type = params.get('type');
  const owner = params.get('owner')?.trim();
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
  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch UHP clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = uhpClientSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid client', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsed.data;
  const { data, error } = await auth.context.admin
    .from('uhp_clients')
    .insert({
      name: input.name,
      status: input.status,
      client_type: input.clientType ?? null,
      interest_state: input.interestState,
      lead_owner: input.leadOwner ?? null,
      source_name: input.sourceName ?? null,
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
  void logActivity(auth.context.admin, {
    userId: auth.context.userId,
    action: 'create_uhp_client',
    tableName: 'uhp_clients',
    recordId: data.id,
  });
  return NextResponse.json({ data }, { status: 201 });
}
