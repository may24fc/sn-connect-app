import { NextResponse } from 'next/server';
import { getAuthedSupabase, hasAtsAccess } from '@/app/api/jobs/_lib';

export async function GET() {
  try {
    const { user, role, hasAtsGrant, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      data: {
        canAccess: hasAtsAccess(role, hasAtsGrant),
        hasGrant: hasAtsGrant,
        role,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/ats/access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}