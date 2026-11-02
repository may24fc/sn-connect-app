import { publishRecognitionPeriod, requireRecognitionUser } from '@/lib/recognition';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function POST(request: Request) {
  const auth = await requireRecognitionUser(true);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = z.object({ periodId: z.string().uuid() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
  try {
    return NextResponse.json({
      data: await publishRecognitionPeriod(parsed.data.periodId, auth.user.id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publication failed' },
      { status: 409 }
    );
  }
}
