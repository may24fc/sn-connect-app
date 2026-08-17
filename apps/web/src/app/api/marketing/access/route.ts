import {
  getMarketingAuthedContext,
  hasMarketingAccess,
} from '@/app/api/marketing/_lib';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const auth = await getMarketingAuthedContext();

    if (!auth.ok && auth.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.ok) {
      return NextResponse.json({ data: { canAccess: false, hasGrant: false, role: null } });
    }

    return NextResponse.json({
      data: {
        canAccess: hasMarketingAccess(auth.role, auth.hasAccessGrant),
        hasGrant: auth.hasAccessGrant,
        role: auth.role,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/marketing/access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
