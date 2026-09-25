import { logActivity } from '@/lib/audit';
import { uhpClientUpdateSchema } from '@/lib/schemas/uhp.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { requireUhpModule } from '../../_lib';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const [clientResult, activitiesResult, notesResult] = await Promise.all([
    auth.context.admin
      .from('uhp_clients')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle(),
    auth.context.admin
      .from('uhp_client_activities')
      .select('*')
      .eq('client_id', id)
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false }),
    auth.context.admin
      .from('uhp_client_notes')
      .select('*')
      .eq('client_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ]);
  if (clientResult.error)
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  if (!clientResult.data) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  return NextResponse.json({
    data: {
      client: clientResult.data,
      activities: activitiesResult.data ?? [],
      notes: notesResult.data ?? [],
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = uhpClientUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid client update' }, { status: 400 });
  const { id } = await params;
  const { data: existing } = await auth.context.admin
    .from('uhp_clients')
    .select('status, interest_state')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  const input = parsed.data;
  const updates: Record<string, unknown> = { updated_by: auth.context.userId };
  const mapping: Record<string, string> = {
    clientType: 'client_type',
    interestState: 'interest_state',
    leadOwner: 'lead_owner',
    sourceName: 'source_name',
    alternatePhone: 'alternate_phone',
    instagramUrl: 'instagram_url',
    jobTitle: 'job_title',
    officeAddress: 'office_address',
    chatgptUrl: 'chatgpt_url',
    dueDate: 'due_date',
  };
  for (const [key, value] of Object.entries(input)) updates[mapping[key] ?? key] = value ?? null;
  const { data, error } = await auth.context.admin
    .from('uhp_clients')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });

  const changes: string[] = [];
  if (input.status && input.status !== existing.status)
    changes.push(`Status changed to ${input.status}`);
  if (input.interestState && input.interestState !== existing.interest_state) {
    changes.push(`Interest marked ${input.interestState}`);
  }
  if (changes.length) {
    await auth.context.admin.from('uhp_client_activities').insert({
      client_id: id,
      activity_type: 'Task',
      title: changes.join('; '),
      status: 'Complete',
      prospect_outcome:
        input.interestState === 'interested' || input.interestState === 'declined'
          ? input.interestState
          : null,
      created_by: auth.context.userId,
      updated_by: auth.context.userId,
    });
  }
  void logActivity(auth.context.admin, {
    userId: auth.context.userId,
    action: 'update_uhp_client',
    tableName: 'uhp_clients',
    recordId: id,
  });
  return NextResponse.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const now = new Date().toISOString();
  const { data, error } = await auth.context.admin
    .from('uhp_clients')
    .update({ deleted_at: now, updated_by: auth.context.userId })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  void logActivity(auth.context.admin, {
    userId: auth.context.userId,
    action: 'archive_uhp_client',
    tableName: 'uhp_clients',
    recordId: id,
  });
  return NextResponse.json({ data: { id } });
}
