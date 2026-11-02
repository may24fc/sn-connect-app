import { requireRecognitionUser } from '@/lib/recognition';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRecognitionUser(true);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = z
    .object({ status: z.enum(['approved', 'rejected']) })
    .safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid nomination decision' }, { status: 400 });
  const { id } = await params;
  const { data, error } = await auth.admin
    .from('recognition_nominations')
    .update({
      status: parsed.data.status,
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Failed to review nomination' }, { status: 500 });
  if (!data)
    return NextResponse.json(
      { error: 'Nomination was already reviewed or does not exist' },
      { status: 409 }
    );
  return NextResponse.json({ data });
}
