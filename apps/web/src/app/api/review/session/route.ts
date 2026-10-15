import { getActiveReviewContext } from '@/lib/review-access';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await getActiveReviewContext();
  if (!result.context) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === 'Unauthorized' ? 401 : 403 }
    );
  }

  return NextResponse.json({ data: result.context });
}
