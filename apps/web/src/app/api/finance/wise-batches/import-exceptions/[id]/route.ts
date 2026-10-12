import { getFinanceContext } from '@/lib/finance/auth';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({ note: z.string().trim().min(10).max(1000) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.capabilities.isLeadership)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: 'Invalid exception ID' }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Enter a resolution note of at least 10 characters' },
      { status: 400 }
    );
  const result = await context.admin
    .from('wise_batch_import_rows')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: context.user.id,
      resolution_note: parsed.data.note,
    })
    .eq('id', id)
    .neq('result', 'completed')
    .is('resolved_at', null)
    .select('id')
    .maybeSingle();
  if (result.error)
    return NextResponse.json({ error: 'Could not resolve Wise exception' }, { status: 500 });
  if (!result.data)
    return NextResponse.json(
      { error: 'Exception is already resolved or missing' },
      { status: 409 }
    );
  return NextResponse.json({ data: { id } });
}
