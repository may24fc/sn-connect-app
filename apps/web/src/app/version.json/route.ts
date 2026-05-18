import { getApplicationVersionPayload } from '@/lib/application-version';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(await getApplicationVersionPayload(), {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Expires: '0',
      Pragma: 'no-cache',
    },
  });
}