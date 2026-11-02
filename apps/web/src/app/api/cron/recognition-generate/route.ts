import { ensureRecognitionPeriod } from '@/lib/recognition';
import { NextResponse } from 'next/server';

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return !secret || request.headers.get('authorization') === `Bearer ${secret}`;
}
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ data: await ensureRecognitionPeriod() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
