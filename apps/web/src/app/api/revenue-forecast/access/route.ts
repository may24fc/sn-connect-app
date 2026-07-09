import {
  getRevenueForecastAuthedContext,
  hasRevenueForecastAccess,
} from '@/app/api/revenue-forecast/_lib';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const auth = await getRevenueForecastAuthedContext();

    if (!auth.ok && auth.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.ok) {
      return NextResponse.json({ data: { canAccess: false, hasGrant: false, role: null } });
    }

    return NextResponse.json({
      data: {
        canAccess: hasRevenueForecastAccess(auth.context.role, auth.context.hasGrant),
        hasGrant: auth.context.hasGrant,
        role: auth.context.role,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/revenue-forecast/access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
