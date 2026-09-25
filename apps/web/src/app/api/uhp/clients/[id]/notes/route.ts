import { logActivity } from '@/lib/audit';
import { uhpClientNoteSchema } from '@/lib/schemas/uhp.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { requireUhpModule } from '../../../_lib';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = uhpClientNoteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid note' }, { status: 400 });
  const { id } = await params;
  const { data, error } = await auth.context.admin
    .from('uhp_client_notes')
    .insert({
      client_id: id,
      title: parsed.data.title,
      body: parsed.data.body ?? null,
      created_by: auth.context.userId,
      updated_by: auth.context.userId,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  void logActivity(auth.context.admin, {
    userId: auth.context.userId,
    action: 'create_uhp_client_note',
    tableName: 'uhp_client_notes',
    recordId: data.id,
    metadata: { clientId: id },
  });
  return NextResponse.json({ data }, { status: 201 });
}
